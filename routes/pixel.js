var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    var tweetFile = req.app.get('tweetFile');
    var x = parseInt(req.params['x']);
    var y = parseInt(req.param['y']);
    var tweetObject = tweetFile.getTweet(x, y);
    var responseObject = {
        x: x,
        y: y
    };
    if (tweetObject == null) {
        responseObject = {available: true};
    } else {
        responseObject = {available: false, tweetData: tweetObject};
    }
    res.json(responseObject);
});

router.post('/', function(req, res, next) {
    var tweetFile = req.app.get('tweetFile');
});

module.exports = router;
