const config = require('./config/environment');

const Options = function(args) {
  this._args = args;
  this.port = args.p || args.port || config.port;
  this.ip = args.ip || config.ip;
  this.files = args._;
}
Options.prototype = {
  check() {
    if (!this.files || this.files.length<=0) return 'Undefined api files/folder!';
    console.log(`${this.files.length} api file/folder founded!`);
  }
}

module.exports = (args) => new Options(args);