const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'healthcare-management-system', 'backend', 'server.js');
const app = require(serverPath);

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  return app(req, res);
};
