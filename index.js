var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var ideasRouter = require('./routes/ideas');
var gcpTasksRouter = require('./routes/gcpTasks');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var Port = process.env.PORT || 8100;

app.listen(Port,()=>{
  console.log(`app listening on port ${Port}`);
});


//module.exports = app;
