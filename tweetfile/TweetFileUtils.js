var fs = require('fs');
var Canvas = require('canvas');
var Image = Canvas.Image;

var IMAGE_WIDTH = 640;
var IMAGE_HEIGHT = 480;
var MAX_TWEET_LENGTH_BYTES = 560;
var MAX_USERNAME_LENGTH_BYTES = 60;
var MAX_TWEET_ID_LENGTH_BYTES = 8;
var COLOR_LENGTH_BYTES = 3;
var TWEET_SLOT_SIZE_BYTES = MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES +
    MAX_TWEET_ID_LENGTH_BYTES + COLOR_LENGTH_BYTES;

var createTweetFile = function (tweetFilePath, secretImagePath) {
    var zeroBuffer = new Buffer(IMAGE_WIDTH * IMAGE_HEIGHT * TWEET_SLOT_SIZE_BYTES);
    zeroBuffer.fill(0);
    fs.writeFileSync(tweetFilePath, zeroBuffer);

    var secretImageFileDescriptor = fs.readFileSync(secretImagePath);
    var secretImage = new Image();
    secretImage.src = secretImageFileDescriptor;
    var secretImageCanvas = new Canvas(IMAGE_WIDTH, IMAGE_HEIGHT);
    var secretImageCanvasContext = secretImageCanvas.getContext('2d');
    secretImageCanvasContext.drawImage(secretImage, 0, 0);
};


module.exports = {
    IMAGE_WIDTH: IMAGE_WIDTH,
    IMAGE_HEIGHT: IMAGE_HEIGHT,
    MAX_TWEET_LENGTH_BYTES: MAX_TWEET_LENGTH_BYTES,
    MAX_USERNAME_LENGTH_BYTES: MAX_USERNAME_LENGTH_BYTES,
    MAX_TWEET_ID_LENGTH_BYTES: MAX_TWEET_ID_LENGTH_BYTES,
    TWEET_SLOT_SIZE_BYTES: TWEET_SLOT_SIZE_BYTES,
    COLOR_LENGTH_BYTES: COLOR_LENGTH_BYTES,

    createTweetFile: createTweetFile
};
