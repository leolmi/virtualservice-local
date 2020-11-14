'use strict';
/*
 200 OK
 Standard response for successful HTTP requests. The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request the response will contain an entity describing or containing the result of the action.

 201 Created
 The request has been fulfilled and resulted in a new resource being created.

 202 Accepted
 The request has been accepted for processing, but the processing has not been completed. The request might or might not eventually be acted upon, as it might be disallowed when processing actually takes place.

 203 Non-Authoritative Information (since HTTP/1.1)
 The server successfully processed the request, but is returning information that may be from another source.

 204 No Content
 The server successfully processed the request, but is not returning any content. Usually used as a response to a successful delete request.

 205 Reset Content
 The server successfully processed the request, but is not returning any content. Unlike a 204 response, this response requires that the requester reset the document view.

 206 Partial Content
 The server is delivering only part of the resource (byte serving) due to a range header sent by the client. The range header is used by tools like wget to enable resuming of interrupted downloads, or split a download into multiple simultaneous streams.

 207 Multi-Status (WebDAV; RFC 4918)
 The message body that follows is an XML message and can contain a number of separate response codes, depending on how many sub-requests were made.[4]

 208 Already Reported (WebDAV; RFC 5842)
 The members of a DAV binding have already been enumerated in a previous reply to this request, and are not being included again.

 226 IM Used (RFC 3229)
 */

const _ = require('lodash');
const vm = require('vm');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const samples = require('../samples');
const URL = require('url');
const _release = typeof __webpack_require__ === "function";
const _use = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
const VSSALT = 'VirtualServiceLeo';
const noop = function() {};
exports.noop = noop;

/**
 * Return standard 200
 * @param res
 * @param obj
 * @param cb
 * @returns {*}
 */
const ok = (res, obj, cb) => {
  cb = cb || noop;
  res.status(200).json(obj);
  return cb(obj);
};
exports.ok = ok;

/**
 * Return standard 201
 * @param res
 * @param obj
 * @param cb
 * @returns {*}
 */
const created = (res, obj, cb) => {
  cb = cb || noop;
  res.status(201).json(obj);
  return cb(obj);
};
exports.created = created;

/**
 * Return standard 204
 * @param res
 * @param obj
 * @param cb
 * @returns {*}
 */
const deleted = (res, obj, cb) => {
  cb = cb || noop;
  res.status(204).json(obj||{});
  return cb(obj);
};
exports.deleted = deleted;

/**
 * Return standard 404
 * @param res
 * @returns {*}
 */
const notfound = (res) => res.status(404);
exports.notfound = notfound;

/**
 * Return standard 500
 * @param res
 * @param err
 * @param [code]
 * @returns {*}
 */
const error = (res, err, code) => {
  if (err && err.message) err = err.message;
  if (!_.isString(err)) err = JSON.stringify(err);
  console.error('virtualservice error:', err);
  res.status(code || 500).send({message:err, error:err});
};
exports.error = error;

/**
 * Handle standard ok response
 */
const ook = (res) => {
  return (err, data) => {
    return (err) ? error(res, err) : ok(res, data);
  };
};
exports.ook = ook;


const notImplemented = (res) => res.status(500).json(':( Not implemented yet!');
exports.notImplemented = notImplemented;

const _salt = (len = 16, code = 'base64') => crypto.randomBytes(len).toString(code);
exports.salt = _salt;

exports.encrypt = (password, salt) => {
  if (!password) return '';
  salt = salt || VSSALT;
  const salt64 = new Buffer(salt, 'base64');
  return crypto.pbkdf2Sync(password, salt64, 10000, 64, 'sha1').toString('base64');
};


/**
 * Effettua il log su console
 * @param message
 * @param [err]
 * @param {number} [maxLength]
 */
const _log = (message, err, maxLength) => {
  let errmsg = '';
  if (err && _.isString(err)) errmsg = err;
  else if (err) errmsg = JSON.stringify(err);
  if (errmsg) message = message + ' ' + errmsg;
  if (message && maxLength) message = message.substr(0, maxLength)+'...';
  if (err) {
    console.error(message);
  } else {
    console.log(message);
  }
};
exports.log = _log;


exports.cllToObj = (cll, o) => {
  const obj = {};
  o = o || {};
  if (_.isArray(cll)) {
    cll.forEach((i) => obj[i[o.name||'name']] = i[o.value||'value']);
  }
  return obj;
};

exports.objToCll = (obj) => {
  return _.map(_.keys(obj||{}), k => ({name:k, value:obj[k]}));
};

const Composer = function(execFnName) {
  this.exec = execFnName || 'exec';
  this.stack = [];
  this.step=  0;
  this.exit = false;
};
Composer.prototype = {
  use(step) {
    const self = this;
    self.stack.push(step);
    return self;
  },
  getStep() {
    const self = this;
    const step = self.step < self.stack.length ? self.stack[self.step] : null;
    self.step++;
    return step;
  },
  run(cb) {
    cb = cb || noop;
    const self = this;
    self.step = 0;
    if (self.stack.length<=0) return cb(self);
    (function next() {
      const step = self.getStep();
      if (self.exit || !step) {
        cb(self);
      } else if (_.isFunction(step)) {
        step.call(self, next, self);
      } else if (_.isFunction(step[self.exec])) {
        step[self.exec](next, self);
      }
    })();
  }
};
exports.compose = () => new Composer();

/**
 * Generate new GUID
 * @returns {string}
 */
exports.guid = (mask) => {
  mask = mask || 'xx-x-x-x-xxx';
  return mask.replace(/[x]/g, () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1));
};

function _toString(o) {
  if (_.isNaN(o) || _.isUndefined(o)) return '';
  if (_.isString(o)) return o;
  if (_.isFunction(o.toString))
    return o.toString();
  return JSON.stringify(o);
}

/**
 * Costruisce un messaggio effettuando la replace con i dati
 * in args (per indice) o i valori in o (object)
 * @param {string} msg
 * @param {array|object} args
 * @param {object} [o]
 * @returns {*}
 */
exports.format = (msg, args, o) => {
  if (args && _.isArray(args)) {
    args.forEach((v, i) => {
      const rgx = new RegExp('\\{' + i + '\\}', 'g');
      msg = msg.replace(rgx, _toString(v));
    });
  }
  else if (args && _.isObject(args)) {
    o = args;
  }
  if (o && _.isObject(o)) {
    for(let pn in o) {
      const rgx = new RegExp('\\{'+pn+'\\}', 'g');
      msg = msg.replace(rgx, _toString(o[pn]));
    }
  }
  return msg;
};

exports.replaceBookmark = (str, bookmark, value) => {
  const rgx = new RegExp('\\[' + bookmark + '\\]','gm');
  return str.replace(rgx, value||'');
};

exports.str = (...args) => {
  let txt = args.shift();
  if (txt) {
    console.log('util.str -  typeof(txt)=%s    txt="%s"', typeof(txt), txt);
    let pi = 0;
    while (txt.indexOf('%s') > -1) {
      txt = txt.replace('%s', '' + (args[pi] || ''));
      pi++;
    }
  }
  return txt;
};

function _getErrorMessage(err) {
  err = err || 'Generic error!';
  if (_.isString(err))
    return err;
  if (_.isObject(err)) {
    if (err.message)
      return err.message;
    if (err.data)
      return _getErrorMessage(err.data);
    if (_.isFunction(err.toString))
      return err.toString();
  }
  return JSON.stringify(err);
}
exports.getErrorMessage = _getErrorMessage;


exports.getExtension = (fn) => {
  fn = fn ? ('' + fn).toLowerCase().trim() : '';
  const p = fn.lastIndexOf('.');
  if (p > 0&& p < fn.length - 1) return fn.substr(p + 1).trim();
};

function _isNulUndNan(v) {
  return _.isNull(v) || _.isUndefined(v) || _.isNaN(v);
}

function _checkBoolValue(value) {
  if (_isNulUndNan(value)) {
    return null;
  } else if (!_.isBoolean(value)) {
    return !!value
  }
  return value;
}
function _checkDatetimeValue(value) {
  if (_isNulUndNan(value))
    return null;
  else if (!_.isDate(value))
    return new Date(value);
  return value;
}
function _checkNumberValue(value) {
  if (_isNulUndNan(value))
    return null;
  else if (!_.isNumber(value))
    return parseFloat(value);
  return value;
}

exports.getTypedValue = (v, type) => {
  switch(type) {
    case 'number':
      return _checkNumberValue(v);
    case 'date':
      return _checkDatetimeValue(v);
    case 'bool':
      return _checkBoolValue(v);
    // case 'string':
    default: return v?''+v:'';
  }
};


exports.getPathObj = (obj, path) => {
  if (!path || !_.isString(path) || !_.isObject(obj)) return;
  path = path.trim();
  if (path.indexOf('[') !== 0) path = '.' + path;
  /*jslint evil: true */
  const f = new Function('o', 'return o' + path);
  try {
    return f(obj);
  } catch (err) {}
};


exports.path = (...args) => {
  const url = [];
  args.forEach((part) => {
    part = part.replace(/:\/\//, '{PATH-PROTOCOL-DELIMITER}');
    part.split(/\//).forEach((p) => {
      if (p === '..') {
        url.pop();
      } else if (p) {
        url.push(p.replace(/{PATH-PROTOCOL-DELIMITER}/, '://'));
      }
    });
  });
  return url.join('/');
};

exports.equal = (s1,s2) => _.isString(s1) && _.isString(s2) && s1.trim().toLowerCase()===s2.trim().toLowerCase();

exports.pad = (str, length, align, char) => {
  switch(align) {
    case 'left':
      return _.padEnd(str, length, char);
    case 'center':
      return _.pad(str, length, char);
    default:
      return _.padStart(str, length, char);
  }
};

const TEXT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum';
const WORDS = TEXT.split(' ');

function _random(min, max, o) {
  let cll;
  if (_.isArray(min)) {
    cll = min;
    min = 0;
    max = cll.length-1;
  }
  if (!_.isNumber(min)) return 0;
  if (!_.isNumber(max)) {
    max = min;
    min = 0;
  }
  const rn = (Math.random() * max) + min;
  const rnv = ((o||{}).decimal && !cll) ? rn : Math.floor(rn);
  return (cll) ? cll[rnv] : rnv;
}

exports.random = _random;

function _randomValue(o) {
  switch(o.type) {
    case 'integer':
      return _random(o.min||0, o.max||100000);
    case 'number':
      return _random(o.min||0, o.max||100000, {decimal:true});
    case 'date':
      const mind = (new Date(2000,1,1)).getTime();
      const maxd = (new Date()).getTime();
      const delta = (o.max||maxd) - (o.min||mind);
      const dt = (o.min||mind) + _random(0, delta);
      return new Date(dt);
    case 'bool':
      return !!_random(0,2);
    // case 'string':
    default:
      const cll = o.words||WORDS;
      return _random(cll);
  }
}

function _row(schema) {
  const row = {};
  schema.forEach((c) => row[c.name] = _randomValue(c));
  return row;
}

exports.generateTable = (o) => {
  const rows = [];
  o = o||{};
  if (!_.isArray(o.columns)||o.columns.length<1) {
    o.columns = [];
    o.colCount = o.colCount||8;
    for (let c = 0; c < o.colCount; c++) {
      o.columns.push({name:'col'+(c+1), type:_random(['string','number','date','bool','integer'])});
    }
  }
  // console.log('GENERATE TABLE schema:', o.columns);
  o.rowCount = o.rowCount||20;
  for(let r = 0; r < o.rowCount; r++) {
    rows.push(_row(o.columns))
  }
  // console.log('GENERATE TABLE:', rows);
  return rows;
};

exports.events = () => {
  return {
    onLog: function() {}
  }
};

exports.elapsed = (tm)  => (new Date()).getTime() - tm.getTime();

exports.use = _use;
exports.release = _release;


exports.io = {
  getFileName(name) {
    return (name||'file').replace(/[\\\/\s:\*\?"<>\|]/gi, '_');
  },
  checkFolder(folder, cb) {
    fs.stat(folder, (err, stats) => {
      if (err) {
        if (err.errno === 34 || err.errno === -4058 || err.code === 'ENOENT') {
          //se non esiste la crea
          fs.mkdir(folder, cb);
        } else {
          cb(err);
        }
      } else {
        cb();
      }
    });
  },
  load(filename, cb) {
    //console.log('try open file: %s',filename);
    fs.stat(filename, (err, stats) => {
      if (err) return cb(err);
      //console.log('try read file: %s',filename);
      fs.readFile(filename, 'utf8', (err, data) => {
        if (err) return cb(err);
        try {
          data = (data||'').replace(/^\uFEFF/, '');
          const obj = JSON.parse(data);
          //console.log('file done:', obj);
          return cb(null, obj);
        } catch(err) {
          cb(err);
        }
      });
    });
  },
  save(filename, obj, cb, noformat) {
    const content = (noformat === true) ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    const buffer = Buffer.from(content);
    try {
      const writer = fs.createWriteStream(filename, {flags: 'w'});
      writer.on('error', (err) => cb(err));
      writer.write(buffer, () => cb());
    } catch(err) {
      cb(err);
    }
  },
  delete(filename, cb) {
    fs.stat(filename, (err, stats) => {
      if (err) return cb(err);
      fs.unlink(filename, (err) => {
        if (err) return cb(err);
        cb();
      });
    });
  },
  truncate(data, path, cb) {
    fs.truncate(path, 0, (err) => {
      if (err) return console.log("Error clearing file: " + err);
      const content = JSON.stringify(data||{}, null, 2);
      fs.writeFile(path, content, (err) => {
        if (err) return console.log("Error writing file: " + err);
        cb();
      });
    });
  },
  on(...args) {
    function __validator(ele, type) {
      switch (type) {
        case 'file':return fs.statSync(ele).isFile();
        case 'directory':
        case 'folder':return fs.statSync(ele).isDirectory();
        default:return false;
      }
    }
    const type = args.shift();
    const cb = args.pop();
    const ele = path.join.apply(null, args);
    console.log('ON type=%s', args);
    if (!_.isFunction(cb)) return;
    if (fs.existsSync(ele)) {
      if (__validator(ele, type)) {
        cb(ele);
      } else {
        cb();
      }
    } else {
      cb();
    }
  }
};

exports.spc = (txt, indent) => {
  const bkm = { N: '\n', T: '\t', R: '\r'};
  return (txt||'').replace(/%%([NTR])/g, (m, type) => indent ? bkm[type] : '');
};

exports.Q = (cb) => new Promise(cb);

function _checkDatePart(parts, dtn, v, label, dec) {
  const nv = (dtn / v);
  const n = dec ? nv : Math.trunc(nv);
  if (n > 0) parts.push(n + label);
  return dtn - (n * v)
}

exports.getTimeStr = (dt) => {
  if (_.isDate(dt)) {
    return dt.toLocaleTimeString() + '.' + _.padStart('' + dt.getMilliseconds(), 3, '0');
  } else if (_.isNumber(dt)) {
    const parts = [];
    dt = _checkDatePart(parts, dt, 1000*60*60*24, 'gg');
    dt = _checkDatePart(parts, dt, 1000*60*60, 'h');
    dt = _checkDatePart(parts, dt, 1000*60, 'm');
    _checkDatePart(parts, dt, 1000, 'sec', true);
    return parts.join(' ');
  } else {
    return ('' + (dt || ''));
  }
};

exports.evalExp = (exp, scope, cb) => {
  scope = scope || {};
  scope._ = _;
  // functions.forEach((f) => scope[f.name] = f.exec);
  const args = _.keys(scope);
  /*jslint evil: true */
  const f = new Function(args, 'return ' + exp);
  try {
    const values = _.map(args, (a) => scope[a]);
    const v = f.apply(f, values);
    return cb(null, v);
  } catch (err) {
    return cb(err);
  }
};

/**
 * Risolve l'espressione passata (1° argomento) considerando il contesto (2° argomento) e
 * un eventuale insieme di utilità (3°,4°,.. argomenti) sotto forma di oggetti o stringhe
 * @param args
 * @returns {*}
 */
// exports.evalScriptA = (...args) => {
//   const expression = args.shift();
//   const context = args.shift();
//   const utils = _.map(args, (a) => {
//     if (_.isObject(a)) {
//       return _.map(_.keys(a), (k) => 'const ' + k + ' = ' + JSON.stringify(a[k]) + ';').join('\n');
//     } else if (_.isString(a)) {
//       return a;
//     } else {
//       return '';
//     }
//   }).join('\n\n');
//   /*jslint evil: true */
//   const f = new Function('context', '_', utils + '\n\n' + expression);
//   return f(context, _, utils);
// };
exports.evalScript = (...args) => {
  const expression = args.shift();
  const sandbox = _.clone(args.shift()) || {};
  sandbox._ = _;
  const utils = _.map(args, (a) => {
    if (_.isObject(a)) {
      return _.map(_.keys(a), (k) => 'const ' + k + ' = ' + JSON.stringify(a[k]) + ';').join('\n');
    } else if (_.isString(a)) {
      return a;
    } else {
      return '';
    }
  }).join('\n\n');
  const script = new vm.Script(utils + '\n\n' + expression);
  const context = new vm.createContext(sandbox);
  return script.runInNewContext(context);
};

exports.parseUrl = (req, base) => {
  req = req || {};
  const U = req.url ? URL.parse(req.url) : {};
  // const u_str = JSON.stringify(U, null, 2);
  // console.log('PARSE URL:\n%s', u_str);
  // console.log('REQUEST', req);
  return {
    user: (req.user||{}).email||req.socket.remoteAddress||'unknown',
    time: Date.now(),
    base: base,
    params: req.query||req.params,
    data: req.body,
    pathname: U.pathname.replace(base||' ', ''),
    pathValue: {},
    verb: (req.method||'').toLowerCase(),
    path: U.path.replace(base||' ', ''),
    host: U.host,
    headers: req.headers||{},
    cookies: req.cookies||{}
  };
};

exports.splitUrl = (url) => {
  url = url || '';
  const dblslh = '##DBLSLH##';
  url = url.replace('//', dblslh);
  const prmpos = url.indexOf('?');
  const params = (prmpos>0) ? url.substr(prmpos+1) : null;
  url = (prmpos>0) ? url.slice(0, prmpos) : url;
  const parts = url.split('/');
  parts[0] = (parts[0]||'').replace(dblslh, '//');
  if (params) parts.push(params);
  return parts;
}

exports.on = (cll, finder, onfound = null, onnotfound = null) => {
  onnotfound = onnotfound || _.noop;
  onfound = onfound || _.noop;
  const ex = _.find(cll||[], finder);
  return !!ex ? onfound(ex) : onnotfound();
};

/**
 * Verifica la correttezza della sintassi dell'url
 * @param args
 * @returns {string}
 */
exports.checkUrl = (...args) => {
  const url = [];
  args.forEach((part) => {
    part = (part||'').replace(/:\/\//, '⌂⌂');
    part.split(/\//).forEach((p) => {
      if (p === '..') {
        url.pop();
      } else if (p && p !== '.') {
        url.push(p.replace(/⌂⌂/, '://'));
      }
    });
  });
  return url.join('/');
};

/**
 * restituisce il js dal testo
 * @param txt
 * @returns {*}
 */
exports.parseJS = (txt) => {
  try {
    txt = ((txt||'')+'').trim();
    if (_.startsWith(txt, '=')) txt = txt.substr(1);
    if (!/return/g.test(txt)) txt = `return ${txt}`;
    txt = `result = (function() {${txt}})();`;
    const script = new vm.Script(txt);
    const scope = {
      _: _,
      samples: samples,
      result: null
    };
    const context = new vm.createContext(scope);
    script.runInNewContext(context);
    return context.result;
  } catch (err) {
    console.error(err, txt);
  }
  return {};
}

exports.checkPath = (...args) => {
  const protocols = {'⌂EPRTCL⌂':':////','⌂FPRTCL⌂':':///','⌂HPRTCL⌂':'://', ':////':'⌂EPRTCL⌂',':///':'⌂FPRTCL⌂','://':'⌂HPRTCL⌂'};
  const parts = (args||[])
    // trimma gli elementi passati e sostituisce i protocol con dei bookmarks
    .map(a => (a||'')
      .replace(/(:\/{4})|(:\/{3})|(:\/{2})/g, (m) => protocols[m])
      .trim())
    // compone l'url completo
    .join('/')
    // scompone adesso l'url in tutte le parti presenti
    .split('/')
    // esclude le parti nulle se non sono al primo posto
    .filter((a,i) => !!a || i===0);
  // considera i doppi punti eliminando le parti precedenti
  let dblpnt = 0;
  do {
    if (dblpnt>0 && parts[dblpnt-1]!=='..') parts.splice(dblpnt-1, 2);
    dblpnt = parts.indexOf('..', 1);
    if (dblpnt>0 && parts[dblpnt-1]==='..') dblpnt = 0;
  } while (dblpnt>0);
  // riaggrega le parti e compone l'url finale
  return parts
    .join('/')
    .replace(/⌂EPRTCL⌂|⌂FPRTCL⌂|⌂HPRTCL⌂/g, (m) => protocols[m]);
}
