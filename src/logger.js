const pino = require('pino');
const fs   = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const transport = pino.transport({
  targets: [
    {
      target:  'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
    {
      target:  'pino/file',
      options: { destination: path.join(logsDir, 'app.log'), append: true },
    },
  ],
});

module.exports = pino({ level: process.env.LOG_LEVEL || 'info' }, transport);
