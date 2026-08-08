const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'healthcare-management-system', 'backend', 'server.js');
const app = require(serverPath);

module.exports = (req, res) => {
  let url = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url || '';
  const pathname = url.split('?')[0];
  if (!pathname.startsWith('/api')) {
    req.url = '/api' + (url.startsWith('/') ? '' : '/') + url;
  }
  return app(req, res);
};
