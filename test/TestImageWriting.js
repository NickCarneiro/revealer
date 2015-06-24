var fs = require('fs');
var path = require('path');
var testUtils = require('./TestUtils');
var TweetFile = require('../tweetfile/TweetFile');
var tweetFilePath = path.resolve(__dirname, 'tweetfile.bin');
var test = require('tape');
var md5 = require('MD5');


test('write a png from the image map with one pixel revealed', function (t) {
    t.plan(1);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    var x = 100;
    var y = 0;
    tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);

    var secretImagePath = path.join(__dirname, '..', 'images', 'pizzakid.png');
    var maskImagePath = path.join(__dirname, '..', 'images', 'mask.png');
    var destinationImagePath = path.join(__dirname, '..', 'images', 'output.png');
    tweetFile.generateStaticImage(secretImagePath, maskImagePath, destinationImagePath,
        function() {
            var resultFileBuffer = fs.readFileSync(destinationImagePath);
            var hash = md5(resultFileBuffer);
            var expectedHash = '1f401cfdf414185dc3a16cf4dbf17c9b';
            t.equal(hash, expectedHash, 'md5 hash of output image');
            tweetFile.close();
            fs.unlinkSync(tweetFilePath);
        });
});


test('write a png from the image map with 25% of the pixels revealed', function (t) {
    t.plan(1);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    for (var y = 0; y < testUtils.IMAGE_HEIGHT / 2; y++) {
        for (var x = 0; x < testUtils.IMAGE_WIDTH / 2; x++) {
            // tweet id and username must be unique
            var tweetId = testUtils.IMAGE_WIDTH * y + x;
            var username = expectedTweet.username + tweetId;
            var memoryOnly = true;
            tweetFile.saveTweet(x, y, username, expectedTweet.content, tweetId, memoryOnly);

        }
    }

    var secretImagePath = path.join(__dirname, '..', 'images', 'pizzakid.png');
    var maskImagePath = path.join(__dirname, '..', 'images', 'mask.png');
    var destinationImagePath = path.join(__dirname, '..', 'images', 'output.png');
    tweetFile.generateStaticImage(secretImagePath, maskImagePath, destinationImagePath,
        function() {
            var resultFileBuffer = fs.readFileSync(destinationImagePath);
            var hash = md5(resultFileBuffer);
            var expectedHash = '25e530d4b79f9e782cb3662be8713c9a';
            t.equal(hash, expectedHash, 'md5 hash of output image');
            tweetFile.close();
            fs.unlinkSync(tweetFilePath);
        });
});