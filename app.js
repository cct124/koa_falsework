const Koa = require('koa');
const config = require('./config/server');
const { useKoaMid, getLogger } = require('./plugins/utils');
const app = new Koa();
const log = getLogger('console');

useKoaMid({ app }, '../middlewares', config.middleware);

app.listen(config.app.port, config.app.host);
log.info(`Server listening on http://${config.app.host}:${config.app.port} mode`, app.env);
