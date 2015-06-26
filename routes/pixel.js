var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    var tweetFile = req.app.get('tweetFile');
    var x = req.param('x');
    var y = req.param('y');
    var tweetObject = tweetFile.getTweet(x, y);
    res.json(tweetObject);
});

router.post('/', function(req, res, next) {
    var tweetFile = req.app.get('tweetFile');
});

module.exports = router;
