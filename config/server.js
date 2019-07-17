'use strict';
const express = require('express');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');
const path = require('path');
const config = require('./environment');
const client_path = config.clientPath||'client';

let _counter = 0;

//CORS middleware
const allowCrossDomain = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
};

//LOG middleware
const serverLog = (req, res, next) => {
  _counter++;
  console.log('virtual-service request n°%s [%s %s]',_counter, req.method, req.url);
  next();
};

module.exports = (app) => {
  const env = app.get('env');

  app.set('views', path.join(config.serverPath, 'views'));
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(compression());

  app.use(bodyParser.json({limit: '100mb'}));
  app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

  app.use(methodOverride());
  app.use(allowCrossDomain);
  app.use(cookieParser());
  app.use(serverLog);

  app.use(express.static(path.join(config.root, client_path)));
  app.set('appPath', client_path);

  app.use(morgan('dev'));
  app.use(errorHandler()); // Error handler - has to be last
};
