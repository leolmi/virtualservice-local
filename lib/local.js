const fs = require('fs');
const VS = function(o) {
  this.options = o;
  this.services = [];
  ((o||{}).files||[]).forEach(f => this._loadFile(f));
};
VS.prototype = {
  _loadFile(f) {
    try {
      if (!!f && /^(.*)\.json$/.test(f)) {
        const json = fs.readFileSync(f, {encoding: 'utf8'});
        const content = JSON.parse(json || '{}');
        if (!!content._vs) {
          this.services.push(content._vs);
          console.log(`${f} ... loaded`)
        }
      }
    } catch(err) {
      console.error(`${f} ... ERROR`, err);
    }
  },
  use(cb) {
    cb(this.services);
  }
};

module.exports = (options) => new VS(options);
