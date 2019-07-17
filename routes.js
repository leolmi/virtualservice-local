'use strict';

module.exports = (app, vs) => {
  app.use((req, res, next) => {
    const m = /.*\/service\/((.*)[\?]\??(.*)?|(.*))/.exec(req.url);
    return m ? require('./api/player')(req, res, vs) : next();
  });
};
