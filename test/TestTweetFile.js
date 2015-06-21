var TweetFile = require('../tweetfile/TweetFile');
var path = require('path');
var fs = require('fs');
var test = require('tape');

var tweetFilePath = path.resolve(__dirname, 'tweetfile.bin');

var IMAGE_WIDTH = 640;
var IMAGE_HEIGHT = 480;
var MAX_TWEET_LENGTH_BYTES = 560;
var MAX_USERNAME_LENGTH_BYTES = 60;
var MAX_TWEET_ID_LENGTH_BYTES = 8;
var TWEET_SLOT_SIZE_BYTES = MAX_TWEET_LENGTH_BYTES + MAX_USERNAME_LENGTH_BYTES +
    MAX_TWEET_ID_LENGTH_BYTES;

// TODO: invalid tweet id
// TODO: invalid username length
// TODO: tweet id collision
// TODO: pixel collision

function createEmptyTweetFile() {
    var zeroBuffer = new Buffer(IMAGE_WIDTH * IMAGE_HEIGHT * TWEET_SLOT_SIZE_BYTES);
    zeroBuffer.fill(0);
    fs.writeFileSync(tweetFilePath, zeroBuffer);
}

test('try to load a missing tweet file', function (t) {
    t.plan(1);
    if (fs.existsSync(tweetFilePath)) {
        fs.unlinkSync(tweetFilePath);
    }
    var instantiateTweetFile = function() {
        new TweetFile(tweetFilePath);
    };
    t.throws(instantiateTweetFile, new Error(), 'Tweet file does not exist');
});


test('try to load an invalid sized tweet file', function (t) {
    t.plan(1);
    fs.writeFileSync(tweetFilePath, "blahblahblah");
    var instantiateTweetFile = function() {
        new TweetFile(tweetFilePath);
    };
    t.throws(instantiateTweetFile, new Error(), 'Tweet file is invalid size.');
});


test('write to beginning of file buffer, read it back from buffer', function (t) {
    createEmptyTweetFile();
    t.plan(1);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(0, 0, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    var loadedTweet = tweetFile.getTweet(0, 0);
    tweetFile.close();
    t.deepEqual(loadedTweet, expectedTweet);
    fs.unlinkSync(tweetFilePath);
});


test('write to beginning of file buffer, read from invalid location', function (t) {
    createEmptyTweetFile();
    t.plan(2);
    var tweetFile = new TweetFile(tweetFilePath);
    var tweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(0, 0, tweet.username, tweet.content, tweet.id);
    var loadedTweet = tweetFile.getTweet(-1, -1);
    var loadedTweet2 = tweetFile.getTweet(10000000, 10000000);
    tweetFile.close();
    t.deepEqual(loadedTweet, null);
    t.deepEqual(loadedTweet2, null);
    fs.unlinkSync(tweetFilePath);
});


test('write to beginning of file buffer and check size of buffer', function (t) {
    t.plan(1);
    createEmptyTweetFile();
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(0, 0, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    tweetFile = new TweetFile(tweetFilePath);
    var fileBufferLength = tweetFile.getFileBufferLength();
    var expectedFileBufferLength = tweetFile.getExpectedFileBufferLength();
    t.deepEqual(fileBufferLength, expectedFileBufferLength);
    tweetFile.close();
    fs.unlinkSync(tweetFilePath);
});




test('write to last slot in file buffer, read it back from buffer', function (t) {
    t.plan(1);
    createEmptyTweetFile();
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(639, 479, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    var loadedTweet = tweetFile.getTweet(639, 479);
    tweetFile.close();
    t.deepEqual(loadedTweet, expectedTweet);
    fs.unlinkSync(tweetFilePath);
});



test('write to first slot in file buffer, close file, read it back from reopened file', function (t) {
    t.plan(1);
    var x = 0;
    var y = 0;
    createEmptyTweetFile();
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    tweetFile.close();

    var reopenedTweetFile = new TweetFile(tweetFilePath);
    var loadedTweet = reopenedTweetFile.getTweet(x, y);
    t.deepEqual(loadedTweet, expectedTweet);
    reopenedTweetFile.close();
    fs.unlinkSync(tweetFilePath);
});


test('write to 5 slots in file buffer, close file, read it back from reopened file', function (t) {
    t.plan(5);
    var expectedTweets = [];
    expectedTweets.push([{username: 'maggie', content: 'slurp', id: 1}, {x: 639, y: 479}]);
    expectedTweets.push([{username: 'lisa', content: 'I need braces', id: 111}, {x: 0, y: 0}]);
    expectedTweets.push([{username: 'bart', content: 'Eat my shorts!', id: 543534}, {x: 101, y: 100}]);
    expectedTweets.push([{username: 'marge', content: 'I don\'t know what marge says', id: 123445}, {x: 100, y: 100}]);
    expectedTweets.push([{username: 'homer', content: 'mmmm unit tests', id: 0}, {x: 1, y: 0}]);
    createEmptyTweetFile();
    var tweetFile = new TweetFile(tweetFilePath);
    expectedTweets.forEach(function(tweet) {
        var coordinates = tweet[1];
        tweet = tweet[0];
        tweetFile.saveTweet(coordinates.x, coordinates.y, tweet.username, tweet.content, tweet.id);
    });
    tweetFile.close();

    var reopenedTweetFile = new TweetFile(tweetFilePath);
    expectedTweets.forEach(function(tweet) {
        var coordinates = tweet[1];
        var expectedTweet = tweet[0];
        var loadedTweet = reopenedTweetFile.getTweet(coordinates.x, coordinates.y);
        t.deepEqual(loadedTweet, expectedTweet);
    });
    reopenedTweetFile.close();
    fs.unlinkSync(tweetFilePath);
});
