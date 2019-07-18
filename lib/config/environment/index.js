'use strict';
const path = require('path');
const root = path.normalize(__dirname + '/../../..');
const DEFAULT_PORT = 9010;

// Export the config object
// ==============================================
module.exports = {
  env: 'development',
  // Root path of server
  root: root,
  // Server ip
  ip: process.env.OPENSHIFT_NODEJS_IP ||
      process.env.SERVER_IP ||
      process.env.IP ||
      process.env.VIRTUALSERVICE_IP ||
      undefined,
  // Server port
  port: process.env.OPENSHIFT_NODEJS_PORT ||
        process.env.SERVER_PORT ||
        process.env.PORT ||
        process.env.VIRTUALSERVICE_PORT ||
        DEFAULT_PORT,
  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'virtualservice-secret'
  },
  // Path del server
  serverPath: path.normalize(__dirname + '/../..'),
  // Path del client
  clientPath: '',
  // Token expires in minutes
  tokenExpiration: '360m'
  // List of user roles
};
