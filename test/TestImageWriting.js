var fs = require('fs');
var path = require('path');
var testUtils = require('./TestUtils');
var TweetFile = require('../tweetfile/TweetFile');
var tweetFilePath = path.resolve(__dirname, 'tweetfile.bin');
var test = require('tape');
var md5 = require('MD5');


test('write a png from the image map', function (t) {
    t.plan(1);
    testUtils.createEmptyTweetFile(tweetFilePath);
    var tweetFile = new TweetFile(tweetFilePath);
    var expectedTweet = {
        username: 'burthawk101',
        content: 'hello world',
        id: 12345
    };
    var x = 0;
    var y = 0;
    tweetFile.saveTweet(x, y, expectedTweet.username, expectedTweet.content, expectedTweet.id);

    var secretImagePath = path.join(__dirname, '..', 'images', 'pizzakid.png');
    var maskImagePath = path.join(__dirname, '..', 'images', 'mask.png');
    var destinationImagePath = path.join(__dirname, '..', 'images', 'output.png');
    tweetFile.generateStaticImage(secretImagePath, maskImagePath, destinationImagePath,
        function() {
            var resultFileBuffer = fs.readFileSync(destinationImagePath);
            var hash = md5(resultFileBuffer);
            var expectedHash = 'f42c3c54d40793435b061be94925c18d';
            t.equal(hash, expectedHash, 'md5 hash of output image');
            tweetFile.close();
            fs.unlinkSync(tweetFilePath);
        });
});