const path = require('path');
let app;
try {
  app = require('./internsAravind_INBT015533_iNeuBytes-main/healthcare-management-system/backend/server');
} catch (e) {
  app = require('../healthcare-management-system/backend/server');
}

module.exports = app;
