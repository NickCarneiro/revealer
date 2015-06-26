var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var TweetFile = require('./tweetfile/TweetFile');

var bodyParser = require('body-parser');
var routes = require('./routes/index');

var users = require('./routes/users');
var pixel = require('./routes/pixel');
var tweetFileUtils = require('./tweetfile/TweetFileUtils');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/pixel', pixel);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

var tweetFilePath = path.resolve(__dirname, 'tweetfile.bin');
if (!fs.existsSync(tweetFilePath) && process.env.CREATE_TWEET_FILE) {
  tweetFileUtils.createTweetFile(tweetFilePath);
} else {
  console.log('Saw existing tweetfile.');
}

var tweetFile = new TweetFile(tweetFilePath);
app.set('tweetFile', tweetFile);
// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// attempt to copy output.png to public/images every minute
var syncPartiallyRevealedImage = function() {
  var outputFileSourcePath = path.join(__dirname, 'images', 'output.png');
  if (fs.existsSync(outputFileSourcePath)) {
    var outputFileDestinationPath = path.join(__dirname, 'public', 'images', 'output.png');
    fs.createReadStream(outputFileSourcePath).pipe(fs.createWriteStream(outputFileDestinationPath));
  }
};

syncPartiallyRevealedImage();
setInterval(syncPartiallyRevealedImage, 60000);
module.exports = app;
