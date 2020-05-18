const fs = require('fs');
const { resolve } = require('path');
const log4js = require('log4js');
const { logConfig, httpLevel } = require('../config/log4js');
const routerRule = require('../config/routerRule');
const { API, MSG } = require('../config/message');

if (process.env.NODE_ENV === 'development') {
  deveHandle();
} else {
  prodHandle();
}

log4js.configure(logConfig);
const httpLog = log4js.getLogger('http');
const resErrLog = log4js.getLogger('ResErr');
const log = getLogger();

/**
 * @desc development环境处理
 */
function deveHandle() {
}

/**
 * @desc production环境处理
 */
function prodHandle() {
  setLog4JsLevel('INFO');
  swaggerControl(true);
}

/**
 * @desc 控制能否访问swagger文档
 * @param {Boolean} bool - true: 禁止访问；false：允许访问
 */
function swaggerControl(bool) {
  const routersConfig = getRouConfig('../routers', 'index');
  for (const iter of routersConfig) {
    routerRule[iter.parent].childPaht[iter.module.config.swaggerHtmlEndpoint.slice(1)].disable = bool;
  }
}

/**
 * @desc 更改log4js配置
 * @param {String} level - level级别
 */
function setLog4JsLevel(level) {
  const category = logConfig.categories.default;
  category.appenders.splice(category.appenders.findIndex(i => i === 'console'), 1);
  category.level = level;
}

/**
 * @desc 获取用户 ip 地址
 * @param {Object} req - 请求
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
    req.connection.remoteAddress || // 判断 connection 的远程 IP
    req.socket.remoteAddress || // 判断后端的 socket 的 IP
    req.connection.socket.remoteAddress;
};

/**
 * @desc 载入目录中的中间件
 * @param {Object} param - 传给中间件的参数 
 * @param {String} dire - 存放js文件的目录路径 
 * @param {Array} paths - 传给中间件的参数 
 */
function useKoaMid(param, dire, paths) {
  paths.map(i => `${dire}/${i}`).map(file => require(resolve(__dirname, file))).forEach(modes => {
    for (const key in modes) {
      if (modes.hasOwnProperty(key)) {
        modes[key](param);
      }
    }
  });
}

/**
 * @desc 返回log实例
 * @param {String} category - 日志分类
 * @return log实例
 */
function getLogger(category) {
  return log4js.getLogger(category);
}

/**
 * @desc Access 日记记录
 * @param {Object} res - koa的response对象 
 * @param {String} category - 日志分类
 * @return 返回 log 实例
 */
function logAccess(res, info) {
  httpLog[getHttpLevel(res.status)](info);
}

/**
 * @desc 根据 status 返回不同的日记级别
 * @param {Number} status - http status
 * @return 返回log4js日记级别
 */
function getHttpLevel(status) {
  if (httpLevel[status]) {
    return httpLevel[status]
  }
  return 'warn'
}

/**
 * @desc 返回子目录下js文件导出的模块
 * @param {String} path - 相对路径
 * @param {String} name - js文件名
 * @return js文件导出的模块
 */
function getRouConfig(path, name) {
  const models = resolve(__dirname, path);
  return fs.readdirSync(models).filter(i => !~i.search(/\.js$/)).map(i => {
    return {
      parent: i,
      module: require(resolve(models, i, `${name}.js`))
    }
  });
}

/**
 * @desc 返回规则对象
 * @param {Array} paths - url路径数组
 * @param {Object} tables - 规则表
 * @return 返回查询的规则对象
 */
function getInterRule(paths, tables) {
  let open = false;
  let disable = false;
  let parent = null;
  let child = null;
  let current = null;
  for (const [i, path] of Object.entries(paths)) {
    parent = (current && paths[i - 1]) ? current : null;
    current = parent ? parent.childPaht[path] : tables[path];
    child = (current && current.childPaht && paths[i + 1]) ? current.childPaht[paths[i + 1]] : null;
    open = (current && current.hasOwnProperty('open')) ? current.open : open;
    disable = (current && current.hasOwnProperty('disable')) ? current.disable : disable;
  }

  return { open, disable }
}

/**
 * @desc 日记中间件
 * @param {Object} ctx - koa的ctx对象
 * @param {Object} next - koa的next对象
 */
async function log4JsMidd(ctx, next) {
  try {
    ctx.resStartTime = new Date();
    await next();
    ctx.resEndTime = new Date();
    const resTime = ctx.resEndTime - ctx.resStartTime;
    logAccess(ctx.response, `${getClientIP(ctx.req)} - ${resTime} ${ctx.request.method} ${ctx.request.url} ${ctx.response.status} - ${ctx.request.header.host} ${ctx.request.header['user-agent']}`);
  } catch (err) {
    ctx.status = 500;
    ctx.body = "server error";
    logAccess(ctx.response, `${getClientIP(ctx.req)} - ${ctx.request.method} ${ctx.request.url} ${ctx.response.status} - ${ctx.request.header.host} ${ctx.request.header['user-agent']}`);
    log.error('server error', err);
  }
}

/**
 * @desc 路由拦截
 * @param {Object} ctx - koa的ctx对象
 * @param {Object} next - koa的next对象
 */
async function inteMidd(ctx, next) {
  const paths = ctx.request.path.slice(1).split('/');
  const rule = getInterRule(paths, routerRule);

  if (rule.disable) {
    ctx.status = 404;
    return ctx.body = 'Not Found';
  } else if (!rule.open) {

  }

  await next();
}

/**
 * @desc koa 响应对象
 * @constructor { ctx: Object [koa的ctx对象], code: Number [api状态码], data: any [返回的数据], msg: String [返回的消息] }
 */
class Res {
  constructor({ ctx, code = null, data = null, msg = null }) {
    this.ctx = ctx;
    this.code = code;
    this.data = data;
    this.msg = msg;
  }

  /**
   * @desc 数据库错误响应
   */
  dbErr() {
    this.ctx.body = {
      code: API.DB_ERR,
      data: this.data,
      msg: this.msg || MSG.DB_ERR,
    };
  }

  /**
   * @desc 响应默认错误
   */
  resErr() {
    this.ctx.body = {
      code: this.code || API.RES_ERR,
      data: this.data,
      msg: this.msg,
    };
  }

  /**
   * @desc 默认请求成功响应
   */
  res() {
    this.ctx.body = {
      code: this.code || API.RES_SUC,
      data: this.data,
      msg: this.msg,
    }
  }

}

module.exports = { getClientIP, useKoaMid, logAccess, getLogger, getHttpLevel, getRouConfig, inteMidd, log4JsMidd }