const { inteMidd, log4JsMidd } = require('../plugins/utils');

module.exports.intercept = ({ app }) => {
  app.use(log4JsMidd);
  app.use(inteMidd);
}