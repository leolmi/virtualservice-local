'use strict';

console.log(`
 _____ _     _           _ _____             _         
|  |  |_|___| |_ _ _ ___| |   __|___ ___ _ _|_|___ ___ 
|  |  | |  _|  _| | | .'| |__   | -_|  _| | | |  _| -_|
 \\___/|_|_| |_| |___|__,|_|_____|___|_|  \\_/|_|___|___| (local) by Leo

 `);
console.log('starting...');
const args = require('yargs').argv;
const options = require('./options')(args);
const error = options.check();
if (error) return console.error(error);
const vs = require('./local')(options);
// Setup server
const express = require('express');
const app = express();
const server = require('http').createServer(app);

require('./config/server')(app);
require('./routes')(app, vs);

// Start server
server.listen(options.port, options.ip, () => console.log('listening on %d\n-----------------------------------------------', options.port));

// Expose app
exports = module.exports = app;