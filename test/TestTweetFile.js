var TweetFile = require('../tweetfile/TweetFile');
var path = require('path');
var fs = require('fs');
var test = require('tape');

var tweetFilePath = path.resolve(__dirname, 'test_tweetfile.bin');

var startTime = Date.now();
var testUtils = require('./TestUtils');

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
    testUtils.createEmptyTweetFile(tweetFilePath);
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
    t.deepEqual(loadedTweet, expectedTweet, 'read tweet from buffer');
    fs.unlinkSync(tweetFilePath);
});


test('write to beginning of file buffer, read from invalid location', function (t) {
    testUtils.createEmptyTweetFile(tweetFilePath);
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
    t.deepEqual(loadedTweet, null, 'tweet at negative coordinates is null');
    t.deepEqual(loadedTweet2, null, 'tweet at coordinates outside bounds is null');
    fs.unlinkSync(tweetFilePath);
});


test('write to beginning of file buffer and check size of buffer', function (t) {
    t.plan(1);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(0, 0, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    var fileBufferLength = tweetFile.getFileBufferLength();
    var expectedFileBufferLength = tweetFile.getExpectedFileBufferLength();
    t.deepEqual(fileBufferLength, expectedFileBufferLength, 'buffer size set correctly');
    tweetFile.close();
    fs.unlinkSync(tweetFilePath);
});




test('write to last slot in file buffer, read it back from buffer', function (t) {
    t.plan(1);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    tweetFile.saveTweet(639, 479, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    var loadedTweet = tweetFile.getTweet(639, 479);
    tweetFile.close();
    t.deepEqual(loadedTweet, expectedTweet, 'read tweet from last slot in buffer');
    fs.unlinkSync(tweetFilePath);
});



test('write to first slot in file buffer, close file, read it back from reopened file', function (t) {
    t.plan(1);
    var x = 0;
    var y = 0;
    testUtils.createEmptyTweetFile(tweetFilePath);
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
    t.deepEqual(loadedTweet, expectedTweet, 'read tweet from first slot in buffer');
    reopenedTweetFile.close();
    fs.unlinkSync(tweetFilePath);
});


test('write to 5 slots in file buffer, close file, read it back from reopened file', function (t) {
    t.plan(7);
    var expectedTweets = [];
    expectedTweets.push([{username: 'maggie', content: 'slurp', id: 1}, {x: 639, y: 479}]);
    expectedTweets.push([{username: 'lisa', content: 'I need braces', id: 111}, {x: 0, y: 0}]);
    expectedTweets.push([{username: 'bart', content: 'Eat my shorts!', id: 543534}, {x: 101, y: 100}]);
    expectedTweets.push([{username: 'marge', content: 'I don\'t know what marge says', id: 123445}, {x: 100, y: 100}]);
    expectedTweets.push([{username: 'homer', content: 'mmmm unit tests', id: 0}, {x: 1, y: 0}]);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    expectedTweets.forEach(function (tweet) {
        var coordinates = tweet[1];
        tweet = tweet[0];
        tweetFile.saveTweet(coordinates.x, coordinates.y, tweet.username, tweet.content, tweet.id);
    });
    tweetFile.close();

    var reopenedTweetFile = new TweetFile(tweetFilePath);
    expectedTweets.forEach(function (tweet) {
        var coordinates = tweet[1];
        var expectedTweet = tweet[0];
        var loadedTweet = reopenedTweetFile.getTweet(coordinates.x, coordinates.y);
        t.deepEqual(loadedTweet, expectedTweet, 'tweet from loaded file');
    });
    // check if bart's tweet was correctly added to the username map
    t.equals(reopenedTweetFile.tweetExists('bart'), true, 'username exists in map');
    // make sure a nonexistent username isn't in the username map
    t.equals(reopenedTweetFile.tweetExists('krusty'), false, 'username does not exist in map');
    reopenedTweetFile.close();
    fs.unlinkSync(tweetFilePath);
});

test('attempt to save some invalid tweets', function (t) {
    t.plan(4);
    var x = 0;
    var y = 0;
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: -1
    };
    var saveInvalidTweetId = function () {
        tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    };
    t.throws(saveInvalidTweetId, new Error(), 'Invalid tweet id');

    expectedTweet = {
        username: 'asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfa',
        content: 'hello world',
        id: 23
    };
    saveInvalidTweetId = function () {
        tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    };
    t.throws(saveInvalidTweetId, new Error(), 'Username too long');


    expectedTweet = {
        username: 'lisa',
        content: 'Benjamin Franklin’s maxim about the inevitability of taxes is so familiar that it has the ring of a cliche. But it suggests a profound truth: Taxes are a certainty we dread almost as much as death. – Steve Forbes, Flat Tax Revolution, Regnery 2005 Benjamin Franklin’s maxim about the inevitability of taxes is so familiar that it has the ring of a cliche. But it suggests a profound truth: Taxes are a certainty we dread almost as much as death. – Steve Forbes, Flat Tax Revolution, Regnery 2005 Benjamin Franklin’s maxim about the inevitability of taxes is so familiar that it has the ring of a cliche. But it suggests a profound truth: Taxes are a certainty we dread almost as much as death. – Steve Forbes, Flat Tax Revolution, Regnery 2005',
        id: 23
    };
    saveInvalidTweetId = function () {
        tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    };
    t.throws(saveInvalidTweetId, new Error(), 'Tweet too long');

    expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 2344
    };
    var saveInvalidTweetPixels = function () {
        tweetFile.saveTweet(-1, 0, expectedTweet.username, expectedTweet.content, expectedTweet.id);
    };
    t.throws(saveInvalidTweetPixels, new Error(), 'Invalid image coordinates');
    tweetFile.close();
    fs.unlinkSync(tweetFilePath);
    var elapsed = Date.now() - startTime;
    console.log('seconds elapsed: ' + elapsed / 1000);
});


// TODO: tweet id collision
// TODO: username collision
// TODO: pixel collision
// TODO: cjk characters