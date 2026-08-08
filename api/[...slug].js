const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'internsAravind_INBT015533_iNeuBytes-main', 'healthcare-management-system', 'backend', 'server.js');
const app = require(serverPath);

module.exports = (req, res) => {
  if (req.url) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const pathParam = urlObj.searchParams.get('__path');
      if (pathParam) {
        req.url = '/api/' + pathParam;
      } else if (!req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
      }
    } catch (e) {
      if (!req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
      }
    }
  } else {
    req.url = '/api';
  }
  return app(req, res);
};
