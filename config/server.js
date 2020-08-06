module.exports = {
  app: {
    host: '0.0.0.0',
    port: 3000
  },
  // middleware目录下要载入运行的js文件名
  middleware: ['intercept', 'router'],
  swagger: ['/api/swagger', '/api/swagger-json']
}