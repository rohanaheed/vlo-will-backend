/**
 * Form Builder Module
 */

const routes = require('./form-builder.routes');
const service = require('./form-builder.service');
const versionService = require('./form-version.service');

module.exports = {
  routes,
  service,
  versionService,
};
