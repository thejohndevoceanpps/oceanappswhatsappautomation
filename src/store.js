const NodeCache = require('node-cache');

/**
 * store.js - Message store for getMessage() retry support.
 *
 * When WhatsApp cannot decrypt a message, it asks the sender to retry.
 * Baileys calls getMessage(key) to get the original content to re-encrypt.
 * We MUST return the real message or undefined — never an empty object/string.
 * Returning { conversation: '' } causes blank messages on the recipient side.
 *
 * WhatsApp retry receipts often arrive hours later if the recipient's phone
 * was offline or sleeping. Retaining messages for 24 hours ensures retries
 * succeed without forcing the user to reset session keys.
 */

const msgCache = new NodeCache({
  stdTTL: 24 * 60 * 60, // 24 hours
  checkperiod: 600,     // Prune expired entries every 10 minutes
  useClones: false,
  maxKeys: 10000,
});

function save(id, message) {
  if (!id || !message) return;
  msgCache.set(id, message);
}

// Returns undefined if not found — intentional, never return empty object/string
function get(id) {
  return msgCache.get(id);
}

module.exports = { save, get };

