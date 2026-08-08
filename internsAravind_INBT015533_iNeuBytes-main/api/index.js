const path = require('path');
const serverPath = path.resolve(__dirname, '..', 'healthcare-management-system', 'backend', 'server.js');
const app = require(serverPath);

module.exports = app;
