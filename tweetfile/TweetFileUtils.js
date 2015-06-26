var fs = require('fs');

var IMAGE_WIDTH = 640;
var IMAGE_HEIGHT = 480;
var MAX_TWEET_LENGTH_BYTES = 560;
var MAX_USERNAME_LENGTH_BYTES = 60;
var MAX_TWEET_ID_LENGTH_BYTES = 8;
var TWEET_SLOT_SIZE_BYTES = MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES +
    MAX_TWEET_ID_LENGTH_BYTES;

var createTweetFile = function(tweetFilePath) {
    console.log('Creating new tweetfile');
    var zeroBuffer = new Buffer(IMAGE_WIDTH * IMAGE_HEIGHT * TWEET_SLOT_SIZE_BYTES);
    zeroBuffer.fill(0);
    fs.writeFileSync(tweetFilePath, zeroBuffer);
};


module.exports = {
    IMAGE_WIDTH: IMAGE_WIDTH,
    IMAGE_HEIGHT: IMAGE_HEIGHT,
    MAX_TWEET_LENGTH_BYTES: MAX_TWEET_LENGTH_BYTES,
    MAX_USERNAME_LENGTH_BYTES: MAX_USERNAME_LENGTH_BYTES,
    MAX_TWEET_ID_LENGTH_BYTES: MAX_TWEET_ID_LENGTH_BYTES,
    TWEET_SLOT_SIZE_BYTES: TWEET_SLOT_SIZE_BYTES,

    createTweetFile: createTweetFile
};
