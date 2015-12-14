"use strict"
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var swig = require('swig');
var ws = require('ws');
var config = require('config');
var fs = require('fs');

/*
 * Configure logs 
 *  - All web + signaling messaging to go in webapp.log
 *  - All Webrtc logs to go in webrtc.log
 */
var logger_cfg = path.join(__dirname, 'logger.json');
var logging_path = path.join(__dirname, '');
configureLog();
var logger = log4js.getLogger('web');
console.log('Logger json - ', logger_cfg);
console.log('Log path - ', logging_path);

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
var swig = new swig.Swig();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }));

//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var routes = require('./routes/index');
app.use('/', routes);
//app.use('/groupcall', wsroutes);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

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



/**
 * Common methods 
 */
// Configure logs 
function configureLog() {
	
	/**
	 * create log file path
	 */
	var logdir = path.join(__dirname, 'logs');

	if (!fs.existsSync(logdir)){
	    fs.mkdirSync(logdir);
	}else {
		/**
		 * Delete previous log files
		 */
		try {
			fs.unlinkSync(path.join(__dirname, 'logs/webapp.log'));
			fs.unlinkSync(path.join(__dirname, 'logs/webrtc.log'));
		}catch(err){
			console.error(err);
		}
	}

	log4js.configure(logger_cfg, { cwd: logging_path });	
};

function deletefile(filepath, callback){
	fs.stat(filepath, function (err, stats) {
		   if (err) {
		       return console.error(err);
		   }
	});
}


module.exports = app;
