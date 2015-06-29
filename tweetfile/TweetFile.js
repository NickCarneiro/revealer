// see readme.md for a loose file format spec
var fs = require('fs');
var Canvas = require('canvas');
var Image = Canvas.Image;

var tweetFileUtils = require('./TweetFileUtils');

var TweetFile = function(tweetFilePath) {
    if (!fs.existsSync(tweetFilePath)) {
        //console.error('Tweet file does not exist at: ', tweetFilePath);
        throw new Error('Tweet file does not exist. Set CREATE_TWEET_FILE ' +
            'environment variable to make a new one.');
        return;
    }
    // check if file is a valid number of bytes
    var fileStats = fs.statSync(tweetFilePath);
    var fileSizeInBytes = fileStats.size;
    if (fileSizeInBytes !== this.getExpectedFileBufferLength()) {
        //console.error('Tweet file is invalid size. Refusing to open: ', tweetFilePath);
        throw new Error('Tweet file is invalid size. Refusing to open.');
        return;
    }
    this.tweetFilePath_ = tweetFilePath;
    this.tweetFileDescriptor_ = fs.openSync(this.tweetFilePath_, 'r+');
    this.writeQueue_ = [];
    this.usernameMap_ = {};
    // we have a file buffer and a file descriptor. We always read and write from the buffer
    // we periodically write the buffer to disk asynchronously
    this.fileBuffer_ = new Buffer(tweetFileUtils.TWEET_SLOT_SIZE_BYTES *
        (tweetFileUtils.IMAGE_HEIGHT * tweetFileUtils.IMAGE_WIDTH));
    fs.readSync(this.tweetFileDescriptor_, this.fileBuffer_, 0, this.fileBuffer_.length, 0);
    this.initializeUsernameMap_();
};


/**
 * we read the tweet buffer and build a map of usernames so we can have fast O(1) lookups
 * of whether or not a user has already submitted a tweet
 * @private
 */
TweetFile.prototype.initializeUsernameMap_ = function() {
    for (var y = 0; y < tweetFileUtils.IMAGE_HEIGHT; y++) {
        for (var x = 0; x < tweetFileUtils.IMAGE_WIDTH; x++) {
            var tweet = this.getTweet(x, y);
            if (tweet !== null) {
                this.usernameMap_[tweet.username] = true;
            }
        }
    }
};


/**
 *
 * @param username
 * @returns {boolean} true if tweet exists for given username, false otherwise
 */
TweetFile.prototype.tweetExists = function(username) {
    return this.usernameMap_[username] === true;
};


/**
 * asynchronously save a new tweet to the tweet file. overwrites previous tweets.
 * @param x
 * @param y
 * @param username
 * @param tweetContent
 * @param tweetId
 * @param memoryOnly {boolean} don't save to disk. Used during testing when we call this 100k times in a loop
 */
TweetFile.prototype.saveTweet = function(x, y, username, tweetContent, tweetId, memoryOnly) {
    //validate inputs
    if (x < 0 || x >= tweetFileUtils.IMAGE_WIDTH || y < 0 || y >= tweetFileUtils.IMAGE_HEIGHT) {
        throw new Error('Invalid image coordinates');
    }
    if (Buffer.byteLength(username, 'utf8') > tweetFileUtils.MAX_USERNAME_LENGTH_BYTES) {
        throw new Error('Username too long');
    }
    if (Buffer.byteLength(tweetContent, 'utf8') > tweetFileUtils.MAX_TWEET_LENGTH_BYTES) {
        throw new Error('Tweet content too long');
    }
    if (isNaN(tweetId) || tweetId < 0) {
        throw new Error('Invalid tweet id');
    }
    if (this.usernameMap_[username]) {
        throw new Error('Tweet already saved for this username');
    }
    var tweetBuffer = this.buildTweetBuffer_(username, tweetContent, tweetId);
    var addressInFile = this.getAddressFromCoordinates_(x, y);
    var filePosition = this.getByteOffsetFromAddress_(addressInFile);
    tweetBuffer.copy(this.fileBuffer_, filePosition);
    // add username to in-memory map
    this.usernameMap_[username] = true;
    if (memoryOnly) {
        return;
    }
    // copy the buffer of this tweet into the fileBuffer_ at its proper index
    var write = fs.write.bind(this, this.tweetFileDescriptor_, this.fileBuffer_, 0, this.fileBuffer_.length, 0,
        this.bufferWrittenToDiskCb_.bind(this));

    // insert this write into the queue so it blocks other writes until this one is complete
    this.writeQueue_.unshift(write);
    if (this.writeQueue_.length === 1) {
        // if there is only one write in the queue, run it. It will pop itself from the queue when complete
        var nextWrite = this.writeQueue_[this.writeQueue_.length - 1];
        nextWrite();
    }
};


TweetFile.prototype.bufferWrittenToDiskCb_ = function() {
    this.writeQueue_.pop(); // remove the last write that just completed
    // and do the next write if there is one.
    if (this.writeQueue_.length > 0) {
        var nextWrite = this.writeQueue_[this.writeQueue_.length - 1];
        nextWrite();
    }
};

TweetFile.prototype.getTweet = function(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
    }
    // don't go outside the buffer
    if (x < 0 || x >= tweetFileUtils.IMAGE_WIDTH || y < 0 || y >= tweetFileUtils.IMAGE_HEIGHT) {
        return null;
    }
    var addressInFile = this.getAddressFromCoordinates_(x, y);
    var filePosition = this.getByteOffsetFromAddress_(addressInFile);
    var tweetBuffer = new Buffer(tweetFileUtils.TWEET_SLOT_SIZE_BYTES);
    this.fileBuffer_.copy(tweetBuffer, 0, filePosition, filePosition + tweetFileUtils.TWEET_SLOT_SIZE_BYTES);
    var tweet = this.unpackTweetBuffer_(tweetBuffer);
    return tweet;
};


TweetFile.prototype.buildTweetBuffer_ = function(username, tweetContent, tweetId) {
    //* 560 bytes of UTF-8 text for a tweet, padded with zeroes
    //* 60 bytes of UTF-8 text for a username
    //* 8 byte unsigned integer for a tweet id
    var buffer = new Buffer(tweetFileUtils.TWEET_SLOT_SIZE_BYTES);
    // zero it out to overwrite random bytes in that memory location
    buffer.fill(0);

    buffer.write(tweetContent);
    buffer.write(username, tweetFileUtils.MAX_TWEET_LENGTH_BYTES);
    buffer.writeDoubleLE(tweetId,
        tweetFileUtils.MAX_TWEET_LENGTH_BYTES + tweetFileUtils.MAX_USERNAME_LENGTH_BYTES);
    return buffer;
};

/**
 *
 * @param tweetBuffer
 * @returns {*} a tweet object of shape
 * {id: 1, content: 'hello world', 'username': 'nickc_dev'}
 * or null if no tweet found
 * @private
 */
TweetFile.prototype.unpackTweetBuffer_ = function(tweetBuffer) {
    //* 560 bytes of UTF-8 text for a tweet, padded with zeroes
    //* 60 bytes of UTF-8 text for a username
    //* 8 byte unsigned integer for a tweet id
    var tweet = {};
    tweet.content =  tweetBuffer.toString('utf-8', 0, tweetFileUtils.MAX_TWEET_LENGTH_BYTES);
    tweet.username = tweetBuffer.toString('utf-8', tweetFileUtils.MAX_TWEET_LENGTH_BYTES,
        tweetFileUtils.MAX_TWEET_LENGTH_BYTES + tweetFileUtils.MAX_USERNAME_LENGTH_BYTES);
    tweet.id = tweetBuffer.readDoubleLE(
        tweetFileUtils.MAX_TWEET_LENGTH_BYTES +tweetFileUtils. MAX_USERNAME_LENGTH_BYTES);

    // The problem is that tweetContent and username are padded with zeroes after the content.
    // I'm not sure how to do this in one step because utf-8 characters are a variable number of bytes.
    // toString knows how to decode them into strings, and from there I can iterate code point by code point
    // potential problem: Tweets containing null characters are going to get truncated
    tweet.content = this.stripTrailingNullCharacters_(tweet.content);
    tweet.username = this.stripTrailingNullCharacters_(tweet.username);

    if (tweet.content === '' && tweet.id === 0 && tweet.username === '') {
        return null;
    } else {
        return tweet;
    }
};


TweetFile.prototype.stripTrailingNullCharacters_ = function(nullPaddedString) {
    var strippedString = '';
    for (var i = 0; i < nullPaddedString.length; i++) {
        var character = nullPaddedString.substring(i, i + 1);
        if (character === '\u0000') {
            return strippedString;
        } else {
            strippedString += character;
        }
    }
    return strippedString;
};


/**
 * origin 0,0 is at upper left of image
 * @param x
 * @param y
 * @returns {*}
 */
TweetFile.prototype.getAddressFromCoordinates_ = function(x, y) {
    return tweetFileUtils.IMAGE_WIDTH * y + x;
};


/**
 *
 * @param address
 * @returns {number}
 */
TweetFile.prototype.getByteOffsetFromAddress_ = function(address) {
    return tweetFileUtils.TWEET_SLOT_SIZE_BYTES * address;
};


/**
 * Synchronously write file buffer to file and close it.
 */
TweetFile.prototype.close = function() {
    fs.writeSync(this.tweetFileDescriptor_, this.fileBuffer_, 0, this.fileBuffer_.length, 0);
    fs.closeSync(this.tweetFileDescriptor_);
    delete this.fileBuffer_;
};


TweetFile.prototype.getFileBufferLength = function() {
    return this.fileBuffer_.length;
};


TweetFile.prototype.getExpectedFileBufferLength = function() {
    return tweetFileUtils.TWEET_SLOT_SIZE_BYTES * tweetFileUtils.IMAGE_HEIGHT * tweetFileUtils.IMAGE_WIDTH;
};

/**
 * reads in secret image, mask image, and writes the partially revealed image to disk
 * @param secretImagePath
 * @param maskImagePath
 * @param destinationImagePath
 * @param callback
 */
TweetFile.prototype.generateStaticImage = function(secretImagePath, maskImagePath, destinationImagePath,
                                                   callback) {
    var maskFileDescriptor = fs.readFileSync(maskImagePath);
    var maskImage = new Image();
    maskImage.src = maskFileDescriptor;
    var canvas = new Canvas(tweetFileUtils.IMAGE_WIDTH, tweetFileUtils.IMAGE_HEIGHT);
    var maskImageCanvasContext = canvas.getContext('2d');
    maskImageCanvasContext.drawImage(maskImage, 0, 0);

    var secretImageFileDescriptor = fs.readFileSync(secretImagePath);
    var secretImage = new Image();
    secretImage.src = secretImageFileDescriptor;
    var secretImageCanvas = new Canvas(tweetFileUtils.IMAGE_WIDTH, tweetFileUtils.IMAGE_HEIGHT);
    var secretImageCanvasContext = secretImageCanvas.getContext('2d');
    secretImageCanvasContext.drawImage(secretImage, 0, 0);

    for (var y = 0; y < tweetFileUtils.IMAGE_HEIGHT; y++) {
        for (var x = 0; x < tweetFileUtils.IMAGE_WIDTH; x++) {
            var tweet = this.getTweet(x, y);
            if (tweet !== null) {

                var pixelData = secretImageCanvasContext.getImageData(x, y, 1, 1).data;
                maskImageCanvasContext.fillStyle = this.pixelDataToRgbString(pixelData);
                //TODO: get color for this x, y pair from the hidden image and set it
                maskImageCanvasContext.fillRect(x, y, 1, 1);
            }
        }
    }

    var fileOutputStream = fs.createWriteStream(destinationImagePath, {flags: 'w'});
    var pngStream = canvas.createPNGStream();

    pngStream.on('data', function(chunk){
        fileOutputStream.write(chunk);
    });
    pngStream.on('end', function() {
        fileOutputStream.end(callback);
    });
};


TweetFile.prototype.pixelDataToRgbString = function(pixelData) {
    return 'rgb(' + pixelData[0] + ', ' + pixelData[1] + ', ' + pixelData[2] + ')';
};

module.exports = TweetFile;