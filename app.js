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
var server = app.listen(3000);
var io = require('socket.io').listen(server);



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
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

// attempt to copy output.png to public/images every minute
var syncPartiallyRevealedImage = function() {
  var secretImagePath = path.join(__dirname, 'images', 'pizzakid.png');
  var maskImagePath = path.join(__dirname, 'images', 'mask.png');
  var destinationImagePath = path.join(__dirname, 'images', 'output.png');

  tweetFile.generateStaticImage(secretImagePath, maskImagePath, destinationImagePath,
      function() {
        console.log('finished generating static png from tweetfile buffer');

        // copy the new image to the public web dir so it will be served on page load
        var outputFileDestinationPath = path.join(__dirname, 'public', 'images', 'output.png');
        fs.createReadStream(destinationImagePath).pipe(fs.createWriteStream(outputFileDestinationPath));
      }
  );
};

syncPartiallyRevealedImage();
setInterval(syncPartiallyRevealedImage, 60000);

io.on('connection', function (socket) {
  app.set('socket', socket);
  app.set('io', io);
});

module.exports = app;
