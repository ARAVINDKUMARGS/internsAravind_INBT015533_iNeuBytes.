const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'internsAravind_INBT015533_iNeuBytes-main', 'healthcare-management-system', 'backend', 'server.js');
const app = require(serverPath);

module.exports = (req, res) => {
  if (req.url) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const realUrl = urlObj.searchParams.get('url');
      if (realUrl) {
        req.url = realUrl;
      }
    } catch (e) {}
  }
  return app(req, res);
};
