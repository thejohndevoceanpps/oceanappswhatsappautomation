/**
 * store.js - Message store for getMessage() retry support.
 *
 * When WhatsApp cannot decrypt a message, it asks the sender to retry.
 * Baileys calls getMessage(key) to get the original content to re-encrypt.
 * We MUST return the real message or undefined — never an empty object/string.
 * Returning { conversation: '' } causes blank messages on the recipient side.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const _store = new Map();

function save(id, message) {
  if (!id || !message) return;
  _store.set(id, message);
  setTimeout(() => _store.delete(id), TTL_MS);
}

// Returns undefined if not found — intentional, never return empty object/string
function get(id) {
  return _store.get(id);
}

module.exports = { save, get };
