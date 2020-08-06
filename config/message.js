module.exports = {
  // 配置api状态和消息
  API: {
    RES_SUC: 2000,  //success
    RES_ERR: 2001,  //server error
    DB_ERR: 2002,  //数据库错误
    AU_ERR: 2003, //没有权限
    TOKEN_INVA: 2004, //token失效
    SYS_BUSY: 2005,  //系统繁忙
  },
  MSG: {
    RES_SUC: 'success',
    RES_ERR: 'error',
    DB_ERR: 'database error',
    AU_ERR: 'permission denied',
  }
}