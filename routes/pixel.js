var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    var tweetFile = req.app.get('tweetFile');
    var x = parseInt(req.query.x, 10);
    var y = parseInt(req.query.y, 10);
    var tweetObject = tweetFile.getTweet(x, y);
    var responseObject = {
        x: x,
        y: y
    };
    if (tweetObject === null) {
        responseObject = {available: true};
    } else {
        responseObject = {available: false, tweetData: tweetObject};
    }
    res.json(responseObject);
});

router.post('/', function (req, res) {
    var tweetFile = req.app.get('tweetFile');
    var socket = req.app.get('socket');
    var io = req.app.get('io');
    var tweetRequest = req.body;
    var existingTweet = tweetFile.getTweet(tweetRequest.x, tweetRequest.y);
    if (existingTweet !== null) {
        return res.status(500).json({error: 'tweet already saved for given coordinates'});
    }
    try {
        tweetFile.saveTweet(tweetRequest.x, tweetRequest.y, tweetRequest.username,
            tweetRequest.tweetContent, tweetRequest.tweetId);
        res.json({});
        var savedTweet = tweetFile.getTweet(tweetRequest.x, tweetRequest.y);
        io.sockets.emit('reveal', { x: tweetRequest.x, y: tweetRequest.y, color: savedTweet.color});
        socket.emit('reveal', { x: tweetRequest.x, y: tweetRequest.y, color: savedTweet.color});
    } catch (e) {
        console.log(e);
        res.status(400).json({error: e.message});
    }
});

module.exports = router;
