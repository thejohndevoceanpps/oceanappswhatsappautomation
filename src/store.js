const fs        = require('fs');
const path      = require('path');
const NodeCache = require('node-cache');

/**
 * store.js - Persistent message store for getMessage() retry support.
 *
 * When WhatsApp cannot decrypt a message, it asks the sender to retry.
 * Baileys calls getMessage(key) to get the original content to re-encrypt.
 * We MUST return the real message or undefined — never an empty object/string.
 *
 * Messages are retained in RAM and mirrored to disk (sessionStore/message_cache.json)
 * so that server restarts do NOT wipe pending retries.
 */

const CACHE_FILE  = path.join(__dirname, '..', 'sessionStore', 'message_cache.json');
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

const msgCache = new NodeCache({
  stdTTL: TTL_SECONDS,
  checkperiod: 600,     // Prune expired entries every 10 minutes
  useClones: false,
  maxKeys: 10000,
});

// Load existing messages from disk on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw  = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    const now  = Date.now();
    let count  = 0;
    for (const [id, item] of Object.entries(data)) {
      if (item && item.message && item.savedAt) {
        const elapsed = (now - item.savedAt) / 1000;
        if (elapsed < TTL_SECONDS) {
          msgCache.set(id, item.message, Math.floor(TTL_SECONDS - elapsed));
          count++;
        }
      }
    }
  }
} catch {
  // Ignore corrupted cache file on startup
}

let flushTimer = null;
function flushToDisk() {
  try {
    const keys = msgCache.keys();
    const data = {};
    const now  = Date.now();
    for (const key of keys) {
      const msg = msgCache.get(key);
      const ttl = msgCache.getTtl(key);
      if (msg) {
        data[key] = {
          message: msg,
          savedAt: ttl ? (ttl - TTL_SECONDS * 1000) : now,
        };
      }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    // Disk write error ignored
  }
}

function save(id, message) {
  if (!id || !message) return;
  msgCache.set(id, message);

  // Debounced flush to disk (1s) to avoid I/O bottlenecks during rapid sends
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToDisk, 1000);
}

// Returns undefined if not found — intentional, never return empty object/string
function get(id) {
  return msgCache.get(id);
}

module.exports = { save, get };

