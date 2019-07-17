'use strict';

const _ = require('lodash');
const vm = require('vm');
const u = require('../../utils');
const fs = require('fs');
const path = require('path');
const _base_url = '/service/';
const _db_object = {};
// const Log = require('./log.model');


function _pathValue(path, o) {
  let s = o;
  path.split('.').forEach((p) => s = s[p]);
  // console.log('PATH VALUE:  path=%s  value=%s  OBJECT:', path, s, o);
  return s;
}

function _evalExp(exp, scope, o) {
  o = o || {};
  exp = (!!o.script) ? exp : 'return ' + exp;
  exp = 'result = (function() {' + exp + '})();';
  const sandbox = _.clone(scope||{});
  sandbox.result = null;
  const script = new vm.Script(exp);
  const context = new vm.createContext(sandbox);
  try {
    script.runInNewContext(context);
    return { value: sandbox.result };
  } catch(err) {
    console.log('EXPRESSION ERROR: ', err);
    return { error: err };
  }
  
}

function _validateExp(exp, scope) {
  const result = _evalExp(exp, scope);
  // console.log('EVALUATE EXP', scope, result);
  return (result.error) ? false : !!result.value;
}

function _getData(o) {
  return (o.verb === 'post') ? o.data : o.params;
}

function _validatedb(s, o) {
  o.context = s._id;
  if (!_db_object[o.context]) _db_object[o.context] = (_.isString(s.dbo)) ? u.parseJS(s.dbo)||{} : {};
}
function _getExpressionScope(o, path = null) {
  return {
    _: _,
    params: o.params,
    data: o.data,
    db: _db_object[o.context],
    samples: {},
    headers: o.headers,
    cookies: o.cookies,
    pathValue: o.pathValue||{},
    value: path ? _pathValue(path, _getData(o)) : null
  }
}
function _validatePath(call, o) {
  const cp = u.splitUrl(call._path);
  const op = u.splitUrl(o.path);
  cp.forEach((part, index) => {
    const m = (/\{(.*?)\}/g).exec(part);
    if (m) o.pathValue[m[1]] = op[index]
  });
}
function _validate(call, o, cb) {
  let error = '';
  let code = 500;
  _validatePath(call, o);
  (call.rules || []).forEach((r) => {
    const scope = _getExpressionScope(o, r.path);
    if (!_validateExp(r.expression, scope)) {
      if (error) error += '\n';
      error += r.error;
      code = r.code || 500;
    }
  });
  cb(error, code);
}
function _getValue(v, o) {
  switch (v.type) {
    case 'data':
      return u.generateTable(v.settings || {});
    // case 'manual':
    default:
      const scope = _getExpressionScope(o); 
      return _evalExp((v.settings || {}).value || 'value', scope).value || '';
  }
}

// function _parseValues(resp, values, o) {
//   _.keys(resp).forEach((k) => {
//     if (_.isString(resp[k]) && resp[k].indexOf('{{')===0) {
//       const rgx = new RegExp('\\{\\{(.*)\\}\\}');
//       const m = rgx.exec(resp[k]);
//       if (m) {
//         const v = _.find(values, (xv) => xv.name===m[1]);
//         if (v) resp[k] = _getValue(v, o);
//       }
//     } else if (_.isObject(resp[k])) {
//       _parseValues(resp[k], values);
//     }
//   });
// }

function _result(res, call, o, owner, pre) {
  let resp = call.response;
  if (_.isString(resp)) {
    try {
      if (_.startsWith(resp, '=')) {
        // è un'espressione
        resp = resp.substr(1);
        const scope = _getExpressionScope(o);
        //_.extend(scope, call.values); 
        const result = _evalExp(resp, scope, {script:true});
        if (result.error) return u.error(res, result.error);
        resp = result.value;
        // console.log('CALC RESULT', call.response);
      } else {
        // è un oggetto
        resp = JSON.parse(resp);
        //_parseValues(call.response, call.values, o);
      }
    } catch (err) {
      return u.error(res, err);
    }
  }
  o.time = Date.now();
  _log(o, owner, resp, call, null, pre);
  // Log.create({ time:Date.now(), owner: owner, call:call, author: o.user, verb: o.verb, content: {response: resp}});
  u.ok(res, resp);
}
function _getFixedPath(path) {
  const m = (/^(.*?)(\/\{|$)/g).exec(path||'');
  return m ? m[1] : path;
}
function _isPath(callpath, urlpath) {
  // let fixed_path = (_getFixedPath(callpath)||'').trim();
  // const isthis = (urlpath||'').indexOf(fixed_path) == 0;
  // console.log('++++>>   FIXED: "%s"      URLPATH: "%s"     =    %s', fixed_path, urlpath, isthis);
  const rgx_path = callpath.replace(/\{(.*?)\}/g, '([^/]+)');
  const rgx = new RegExp(`^${rgx_path}$`, 'gi');
  return rgx.test(urlpath || '');
  // console.log('++++>> callpath: "%s"     rgx_path: "%s"      urlpath: "%s"     =    %s', callpath, rgx_path, urlpath, isthis);
  // return isthis;
}
function _findCall(service, o, cb) {
  const call = _.find(service.calls||[], (c) => _isPath(u.path(service.path, c.path), o.pathname) && (o.verb==='options' || u.equal(c.verb, o.verb)));
  const err = (!call) ? 'No call can reply!' : null;
  cb(err, call);
}

function _download(res, call) {
  if (!call.file) return u.error(res, 'Undefined file!');
  fs.stat(call.file, (err, stats) => {
    if (err) return u.error(res, err);
    const filename = path.basename(call.file);
    res.download(call.file, filename);
  });
}

function _finder(o) {
  return () => {
    console.log('FINDER', o);
    return (o.pathname||'').indexOf(this.path + '/') === 0;
    // return _.startsWith(o.pathname||'', this.path + '/');
  }
}

function _raiseError(res, owner, o, err, code = null) {
  o = o || {};
  // Log.create({ time:obj.time, owner:owner, error: err, author: o.user||'unknown', verb: o.verb||'...', content: o});
  _log(o, owner, {}, null, err);
  if (owner) console.log('OWNER=', owner);
  return u.error(res, err, code);
}

function _log(o, owner, response, call, error, pre) {
  o = o || {};
  const now = Date.now();
  const time = o.time || now;
  const log = {
    _id: u.guid(),
    time: time,
    prevId: pre ? pre._id : null,
    owner: owner, 
    path: '' + o.base + o.path,
    call: call,
    author: o.user || 'unknown', 
    verb: o.verb || '...',
    elapsed: pre ? now - pre.time : 0
  };
  log.content = log.content || {};
  if (response) {
    log.content.request = pre ? pre.content.request : {};
    log.content.response = response;
  } else {
    log.content.request = o;
    log.content.response = 'waiting...'
  }
  log.error = error ? error : null;
  // Log.create(log);
  return log;
}

module.exports = (req, res, vs) => {
  const o = u.parseUrl(req, _base_url);
  const services = _.filter(vs.services, s => !!s.path && (o.pathname||'').indexOf(s.path + '/') === 0);
  // console.log('match services: ', services);
  if (!services || services.length<1) return _raiseError(res, null, o, 'No service can reply!');
  if (services.length>1) return _raiseError(res, services.map(s => s._id).join(','), o, 'More than one service!');
  const srv = services[0];
  if (srv.active === false) return _raiseError(res, srv._id, o, 'Service not active!');
  _findCall(srv, o, (err, call) => {
    if (err) return _raiseError(res, srv._id, o, err);
    if (o.verb === 'options') return u.ok(res);
    call._path = u.path(srv.path, call.path);
    _validatedb(srv, o);
    _validate(call, o, (err, code) => {
      if (err) return _raiseError(res, srv._id, o, err, code);
      // Log.create({ time:o.time, owner:srv._id, call:call, content:{request: o}, author: o.user, verb: o.verb});
      const pre = _log(o, srv._id, null, call, null);
      if (call.respType === 'file') return _download(res, call);
      _result(res, call, o, srv._id, pre);
    });
  });
};
