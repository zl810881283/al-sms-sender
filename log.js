const log4js = require('log4js')
log4js.configure({
  appenders: { SMS: { type: 'file', filename: 'SMS.log' } },
  categories: { default: { appenders: ['SMS'], level: 'info' } }
});

const logger = log4js.getLogger('SMS')

module.exports = logger