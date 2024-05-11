const fs = require('fs');
const { resolve } = require('path');
const log4js = require('log4js');
const { logConfig, httpLevel } = require('../config/log4js');
const routerRule = require('../config/routerRule');
const { API, MSG } = require('../config/message');
const config = require('../config/server');
var schedule = require('node-schedule');

// 限制用户访问api的频率
const frequency = {};


if (process.env.NODE_ENV === 'development') {
  deveHandle();
} else {
  prodHandle();
}

log4js.configure(logConfig);
const httpLog = log4js.getLogger('http');
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
  const swaList = config.swagger;
  for (const paths of swaList) {
    const pathArr = paths.slice(1).split('/')
    routerRule[pathArr[0]].childPaht[pathArr[1]].disable = bool;
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
  return req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
    req.connection.remoteAddress || // 判断 connection 的远程 IP
    req.socket.remoteAddress || // 判断后端的 socket 的 IP
    req.connection.socket.remoteAddress;
};

/**
 * @desc 载入目录中的中间件
 * @param {Object} param - 传给中间件的参数 
 * @param {String} dire - 存放js文件的目录路径 
 * @param {Array} paths - 中间件的文件名
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
 * @desc http 日记记录
 * @param {Object} res - koa的response对象
 * @param {String} category - 日志分类
 * @return 返回 log 实例
 */
function logHttp(ctx) {
  return `${getClientIP(ctx.req)} - ${ctx.resTime} ${ctx.request.method} ${ctx.request.url} ${ctx.response.status}${(ctx.body && ctx.body.code && ctx.body.code !== API.RES_SUC) ? ' - ' + ctx.body.code + ' ' + ctx.body.msg : ''} - ${ctx.request.header.host} ${ctx.request.header['user-agent']}`;
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
function getInterRule(ctx, paths, tables) {
  const def = {
    open: false,
    disable: false,
    frequency: {},
  };
  let parent = null;
  let child = null;
  let current = null;
  let pathLevel = [];

  for (const [i, path] of Object.entries(paths)) {
    pathLevel.push(path);
    parent = (current && paths[i - 1]) ? current : null;
    if (!parent || parent.hasOwnProperty('childPaht')) current = parent ? parent.childPaht[path] : tables[path];
    child = (current && current.childPaht && paths[i + 1]) ? current.childPaht[paths[i + 1]] : null;
    def.open = (current && current.hasOwnProperty('open')) ? current.open : def.open;
    def.disable = (current && current.hasOwnProperty('disable')) ? current.disable : def.disable;
    if (current && current.hasOwnProperty('frequency') && (current.frequency.met === 'ALL' || current.frequency.met === ctx.request.method)) {
      def.frequency = current.frequency;
      def.frequency.pathLevel = [...pathLevel];
    };
  }

  return { ...def }
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
    logAccess(ctx);
  } catch (err) {
    if (err.status === 400) {
      ctx.status = err.status;
      new Res(ctx, {
        msg: `incorrect field: ${err.field} please check again!`
      }).resErr();
    } else {
      ctx.status = 500;
      new Res(ctx, {
        msg: `server error`
      }).resErr();
      log.error('server error', err);
    }
    return logAccess(ctx)
  }
}

/**
 * @desc 记录http请求
 * @param {Object} ctx - koa的ctx对象
 */
function logAccess(ctx) {
  const res = ctx.response;
  ctx.resEndTime = new Date();
  ctx.resTime = ctx.resEndTime - ctx.resStartTime;
  if (ctx.body && ctx.body.code && ctx.body.code !== API.RES_SUC) {
    httpLog.warn(logHttp(ctx));
  } else {
    httpLog[getHttpLevel(res.status)](logHttp(ctx));
  }
}

/**
 * @desc 路由拦截
 * @param {Object} ctx - koa的ctx对象
 * @param {Object} next - koa的next对象
 */
async function inteMidd(ctx, next) {
  const paths = ctx.request.path.slice(1).split('/');
  const rule = getInterRule(ctx, paths, routerRule);


  // 限制api访问频率的处理流程
  if (rule.frequency.time) {
    const key = `${ctx.request.ip}${rule.frequency.pathLevel.join('')}`;
    if (frequency[key]) {
      frequency[key].f++;
      if (frequency[key].f > rule.frequency.value) {
        return new Res(ctx, {
          code: API.SYS_BUSY,
          msg: 'System Busy'
        }).resErr();
      }
    } else {
      const date = new Date(new Date().getTime() + rule.frequency.time);
      frequency[key] = {
        f: 1,
        schedule: schedule.scheduleJob(date, function () {
          delete frequency[key];
        })
      }
    }

  }

  if (rule.disable) {

    // 禁止访问的资源
    ctx.status = 404;
    ctx.body = 'Not Found';
    return;

  } else if (!rule.open) {

  }

  await next();
}

/**
 * @desc koa 响应对象
 * @constructor { ctx: Object [koa的ctx对象], code: Number [api状态码], data: any [返回的数据], msg: String [返回的消息] }
 */
class Res {
  constructor(ctx, { code = null, data = null, msg = null, err = null }) {
    this.ctx = ctx;
    this.code = code;
    this.data = data;
    this.msg = msg;
    this.err = err;
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
    if (this.err) log.error(`database error`, this.err);

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
    if (this.err) log.error(`responses error`, this.err);
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

module.exports = { getClientIP, useKoaMid, logHttp, getLogger, getHttpLevel, inteMidd, log4JsMidd, Res }