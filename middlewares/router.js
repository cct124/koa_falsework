const router = require('../routers/router');
const koaBody = require('koa-body');

module.exports.useSgrt = ({ app }) => {
  app.use(koaBody())
    .use(router.routes())
    .use(router.allowedMethods());
}