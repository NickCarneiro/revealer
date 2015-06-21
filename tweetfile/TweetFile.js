// see readme.md for a loose file format spec
var fs = require('fs');

var IMAGE_WIDTH = 640;
var IMAGE_HEIGHT = 480;
var MAX_TWEET_LENGTH_BYTES = 560;
var MAX_USERNAME_LENGTH_BYTES = 60;
var MAX_TWEET_ID_LENGTH_BYTES = 8;
var TWEET_SLOT_SIZE_BYTES = MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES +
    MAX_TWEET_ID_LENGTH_BYTES;


var TweetFile = function(tweetFilePath) {
    if (!fs.existsSync(tweetFilePath)) {
        //console.error('Tweet file does not exist at: ', tweetFilePath);
        throw new Error('Tweet file does not exist');
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
    // we have a file buffer and a file descriptor. We always read and write from the buffer
    // we periodically write the buffer to disk asynchronously
    this.fileBuffer_ = new Buffer(TWEET_SLOT_SIZE_BYTES * (IMAGE_HEIGHT * IMAGE_WIDTH));
    fs.readSync(this.tweetFileDescriptor_, this.fileBuffer_, 0, this.fileBuffer_.length, 0);
};


/**
 * asynchronously save a new tweet to the tweet file. overwrites previous tweets.
 * @param x
 * @param y
 * @param username
 * @param tweetContent
 * @param tweetId
 */
TweetFile.prototype.saveTweet = function(x, y, username, tweetContent, tweetId) {
    //validate inputs
    if (x < 0 || x >= IMAGE_WIDTH || y < 0 || y >= IMAGE_HEIGHT) {
        throw new Error('Invalid image coordinates');
    }
    if (Buffer.byteLength(username, 'utf8') > MAX_USERNAME_LENGTH_BYTES) {
        throw new Error('Username too long');
    }
    if (Buffer.byteLength(tweetContent, 'utf8') > MAX_TWEET_LENGTH_BYTES) {
        throw new Error('Tweet content too long');
    }
    if (isNaN(tweetId) || tweetId < 0) {
        throw new Error('Invalid tweet id')
    }
    var tweetBuffer = this.buildTweetBuffer_(username, tweetContent, tweetId);
    var addressInFile = this.getAddressFromCoordinates_(x, y);
    var filePosition = this.getByteOffsetFromAddress_(addressInFile);
    // copy the buffer of this tweet into the fileBuffer_ at its proper index
    tweetBuffer.copy(this.fileBuffer_, filePosition);
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
    if (x < 0 || x >= IMAGE_WIDTH || y < 0 || y >= IMAGE_HEIGHT) {
        return null;
    }
    var addressInFile = this.getAddressFromCoordinates_(x, y);
    var filePosition = this.getByteOffsetFromAddress_(addressInFile);
    var tweetBuffer = new Buffer(TWEET_SLOT_SIZE_BYTES);
    this.fileBuffer_.copy(tweetBuffer, 0, filePosition, filePosition + TWEET_SLOT_SIZE_BYTES);
    var tweet = this.unpackTweetBuffer_(tweetBuffer);
    return tweet;
};


TweetFile.prototype.buildTweetBuffer_ = function(username, tweetContent, tweetId) {
    //* 560 bytes of UTF-8 text for a tweet, padded with zeroes
    //* 60 bytes of UTF-8 text for a username
    //* 8 byte unsigned integer for a tweet id
    var buffer = new Buffer(TWEET_SLOT_SIZE_BYTES);
    // zero it out to overwrite random bytes in that memory location
    buffer.fill(0);

    buffer.write(tweetContent);
    buffer.write(username, MAX_TWEET_LENGTH_BYTES);
    buffer.writeDoubleLE(tweetId, MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES);
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
    tweet.content =  tweetBuffer.toString('utf-8', 0, MAX_TWEET_LENGTH_BYTES);
    tweet.username = tweetBuffer.toString('utf-8', MAX_TWEET_LENGTH_BYTES,
        MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES);
    tweet.id = tweetBuffer.readDoubleLE(MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES);

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
    return IMAGE_WIDTH * y + x;
};


/**
 *
 * @param address
 * @returns {number}
 */
TweetFile.prototype.getByteOffsetFromAddress_ = function(address) {
    return TWEET_SLOT_SIZE_BYTES * address;
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
    return TWEET_SLOT_SIZE_BYTES * IMAGE_HEIGHT * IMAGE_WIDTH;
};


module.exports = TweetFile;