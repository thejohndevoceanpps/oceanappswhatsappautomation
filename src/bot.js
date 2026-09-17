/**
 * bot.js - WhatsApp socket lifecycle.
 *
 * E2EE fix for "Waiting for this message":
 *   getMessage returns stored outgoing messages for retry re-encryption,
 *   or undefined (never empty) when the message is not in our store.
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const qrcode = require('qrcode-terminal');
const pino   = require('pino');
const path   = require('path');

const logger               = require('./logger');
const store                = require('./store');
const { runNotifications } = require('./notifier');
const { handleIncoming }   = require('./chatbot');

const SESSION_DIR      = path.join(__dirname, '..', 'sessionStore');
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 60_000;

async function createBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version }          = await fetchLatestBaileysVersion();

  logger.info({ version }, 'Initialising WhatsApp socket');

  const sock = makeWASocket({
    version,
    auth:              state,
    printQRInTerminal: false,
    logger:            pino({ level: 'silent' }),
    browser:           ['BetterNotifications', 'Chrome', '1.0.0'],
    getMessage: async ({ id }) => store.get(id), // undefined if not found
  });

  sock.ev.on('creds.update', saveCreds);

  let pollingTimer = null;

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
      const code            = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ code }, `Connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        logger.info('Reconnecting in 5s...');
        setTimeout(createBot, 5000);
      } else {
        logger.error('Logged out. Delete sessionStore/ and restart to re-link.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      logger.info('WhatsApp connected successfully ✅');

      sock.ev.on('messages.upsert', (upsert) => {
        handleIncoming(sock, upsert).catch(err =>
          logger.error({ err }, 'Unhandled error in chatbot handler')
        );
      });

      try { await runNotifications(sock); }
      catch (err) { logger.error({ err }, 'Error in initial notification run'); }

      pollingTimer = setInterval(async () => {
        try { await runNotifications(sock); }
        catch (err) { logger.error({ err }, 'Error in scheduled notification run'); }
      }, POLL_INTERVAL_MS);

      logger.info(`⏱ Notification polling every ${POLL_INTERVAL_MS / 1000}s`);
    }
  });
}

module.exports = { createBot };
