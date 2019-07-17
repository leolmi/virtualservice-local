'use strict';

const LogSchema = function(l) {
  this._id = '';
  this.time = 0;
  this.prevId = '';
  this.owner = '';
  this.error = null;
  this.content = null;
  this.call = null;
  this.path = '';
  this.author = '';
  this.verb = '';
  this.elapsed = 0;
  Object.assign(this, l || {});
}

module.exports = LogSchema;