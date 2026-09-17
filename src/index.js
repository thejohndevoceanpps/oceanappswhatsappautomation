require('dotenv').config();
const logger      = require('./logger');
const { createBot } = require('./bot');

if (process.env.TEST_MODE === 'true') {
  logger.warn('TEST_MODE=true — time-window checks disabled. Remove in production!');
}

createBot().catch(err => {
  logger.error({ err }, 'Fatal startup error — exiting');
  process.exit(1);
});
