'use strict';

const _ = require('lodash');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const u = require('../../utils');
const _base_url = '/service/';
const _db_object = {};
const _functions_cache = {};
const MIN_INTERVAL_FUNCTION = 1;



const _pathValue = (path, o) => {
  let s = o;
  path.split('.').forEach((p) => s = s[p]);
  // console.log('PATH VALUE:  path=%s  value=%s  OBJECT:', path, s, o);
  return s;
}

const _updateDB = (o, res) => (!!(res||{}).db) ? _.extend(_db_object[o.context], res.db) : null;

const _isJson = (exp) => /^[\{\[]/g.test(exp);

const _evalExp = (exp, scope) => {
  exp = (exp || '').trim();
  if (_.startsWith(exp, '=')) exp = exp.substr(1);
  if (_isJson(exp)) exp = `return ${exp}`;
  exp = `result = (function() {${exp}})();`;
  const sandbox = _.clone(scope||{});
  sandbox.result = null;
  const script = new vm.Script(exp);
  const context = new vm.createContext(sandbox);
  try {
    script.runInNewContext(context);
    return { value: sandbox.result, db: sandbox.db };
  } catch(err) {
    console.log('EXPRESSION ERROR: ', err);
    return { error: err };
  }
}

const _validateExp = (exp, scope) => {
  const result = _evalExp(exp, scope);
  return (result.error) ? false : !!result.value;
}

const _getData = (o) => (o.verb === 'post') ? o.data : o.params;

const _stopFunction = (s, message, obj) => {
  console.warn(message||`Service function stopped ${s.name} (${s._id})`, obj||` "${s.name}" (owner: ${s.owner})`);
  if (!!_functions_cache[s._id]) clearInterval(_functions_cache[s._id]);
}

const _executeFunction = (s, o) => {
  const scope = _getExpressionScope(o);
  console.log(`execute timed function for "${s.name}" (owner: ${s.owner})`);
  const res = _evalExp(s.function, scope);
  if (!!res.error) return _stopFunction(s, `Error while eval function ${s.name} (${s._id})`, res.error);
  _updateDB(o, res);
}

const _validateServiceFunction = (s, o) => {
  if (!!((s||{}).function||'').trim()) {
    if (!!_functions_cache[s._id]) clearInterval(_functions_cache[s._id]);
    if (s.interval >= MIN_INTERVAL_FUNCTION) _functions_cache[s._id] = setInterval(() => _executeFunction(s, o), (s.interval*1000));
  }
}

const _validatedb = (s, o) => {
  o.context = s._id;
  _validateServiceFunction(s, o);
  if (!_db_object[o.context]) _db_object[o.context] = (_.isString(s.dbo)) ? u.parseJS(s.dbo)||{} : {};
}
const _getExpressionScope = (o, path = null) => {
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
const _validatePath = (call, o) => {
  const cp = u.splitUrl(call._path);
  const op = u.splitUrl(o.path);
  cp.forEach((part, index) => {
    const m = (/\{(.*?)\}/g).exec(part);
    if (m) o.pathValue[m[1]] = op[index]
  });
}
const _validate = (call, o, cb) => {
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

const _endRresult = (res, call, o, owner, pre, resp) => {
  o.time = Date.now();
  _log(o, owner, resp, call, null, pre);
  u.ok(res, resp);
}

const _isPromiseLike = (prm) => { return _.isObject(prm) && _.isFunction(prm.then) }

const _result = (res, call, o, owner, pre) => {
  let resp = (call.response||'').trim();
  try {
    const scope = _getExpressionScope(o);
    const result = _evalExp(resp, scope);
    if (result.error) return u.error(res, result.error);
    resp = result.value;
    if (_isPromiseLike(resp)) {
      resp.then(
        (r) => {
          _updateDB(o, result);
          _endRresult(res, call, o, owner, pre, r);
        },
        (er1) => u.error(res, er1)
      )
    } else {
      _updateDB(o, result);
      _endRresult(res, call, o, owner, pre, resp);
    }
  } catch (er2) {
    return u.error(res, er2);
  }
}

const _isPath = (callpath, urlpath) => {
  const cpath = (callpath||'').split('?')[0];
  const rgx_path = cpath.replace(/\{(.*?)\}/g, '([^/]+)');
  const rgx = new RegExp(`^${rgx_path}$`, 'gi');
  return rgx.test(urlpath || '');
}

const _findCall = (service, o, cb) => {
  const call = _.find(service.calls||[], (c) => _isPath(u.checkPath(service.path, c.path), o.pathname) && (o.verb==='options' || u.equal(c.verb, o.verb)));
  const err = (!call) ? 'No call can reply!' : null;
  cb(err, call);
}

const _download = (res, call) => {
  if (!call.file) return u.error(res, 'Undefined file!');
  fs.stat(call.file, (err, stats) => {
    if (err) return u.error(res, err);
    const filename = path.basename(call.file);
    res.download(call.file, filename);
  });
}

const _raiseError = (res, owner, o, err, code = null) => {
  o = o || {};
  _log(o, owner, {}, null, err);
  return u.error(res, err, code);
}

const _log = (o, owner, response, call, error, pre) => {
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
  console.log(log);
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
  _findCall(srv, o, (er1, call) => {
    if (er1) return _raiseError(res, srv._id, o, er1);
    if (o.verb === 'options') return u.ok(res);
    call._path = u.checkPath(srv.path, call.path);
    _validatedb(srv, o);
    _validate(call, o, (er2, code) => {
      if (er2) return _raiseError(res, srv._id, o, er2, code);
      const pre = _log(o, srv._id, null, call, null);
      if (call.respType === 'file') return _download(res, call);
      _result(res, call, o, srv._id, pre);
    });
  });
};
