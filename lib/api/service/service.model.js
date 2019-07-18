'use strict';

const ServiceCallRuleSchema = function(r) {
  this.expression = '';
  this.path = '';
  this.error = '';
  this.code = 500;
  Object.assign(this, r || {});
};

const ServiceCallSchema = function(c) {
  this.path = '';
  this.verb = '';
  this.description = '';
  this.response = '';
  this.file = '';
  this.respType = '';
  this.rules = [];
  Object.assign(this, c || {});
  this.rules = this.rules.map(r => new ServiceCallRuleSchema(r));
}

const ServiceSchema = function(s) {
  this.owner = '',
  this.lastChange = 0;
  this.creationDate = 0;
  this.author = '';
  this.name = '';
  this.description = '';
  this.dbo = '';
  this.path = '';
  this.calls = [];
  Object.assign(this, s || {});
  this.calls = this.calls.map(c => new ServiceCallSchema(c));
  this.active = true;
}

module.exports = ServiceSchema;