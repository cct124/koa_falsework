const logConfig = {
  appenders: {
    access: {
      type: 'dateFile',
      filename: 'log/access.log',
      pattern: '-yyyy-MM-dd',
      daysToKeep: 60,
      category: 'http'
    },
    app: {
      type: 'file',
      filename: 'log/app.log',
      maxLogSize: 10485760,
      numBackups: 3
    },
    console: {
      type: 'stdout'
    },
    errorFile: { type: 'file', filename: 'log/errors.log' },
    errors: { type: 'logLevelFilter', level: 'ERROR', appender: 'errorFile' }
  },
  categories: {
    default: { appenders: ["app", "errors", "console"], level: 'DEBUG' },
    console: { appenders: ["app", "console"], level: 'INFO' },
    http: { appenders: ["access"], level: 'INFO' },
    ResErr: { appenders: ["access", "errors"], level: 'ERROR' },
  }
}

const httpLevel = {
  200: 'info',
  500: 'error'
}

module.exports = { logConfig, httpLevel }