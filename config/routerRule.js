module.exports = {
  // 路由拦截规则配置
  // open 是否验证token
  // disable 是否禁止访问
  // frequency 限制api的访问频率
  admin: {
    open: true,
    disable: false,
    childPaht: {
      swagger: {
        disable: false,
      }
    }
  },
  api: {
    open: false,
    disable: false,
    childPaht: {
      swagger: {
        open: true,
        disable: false,
      }
    }
  },
}