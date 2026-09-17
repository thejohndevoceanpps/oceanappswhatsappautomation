const fs   = require('fs');
const path = require('path');

const LOG_PATH    = path.join(__dirname, '..', '..', 'sent_log.json');
const MAX_PER_DAY = 3;
const MIN_GAP_MS  = 4 * 60 * 60 * 1000;

let log = {};
try { log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch { log = {}; }

function _save() {
  try { fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2)); } catch {}
}

function _today() { return new Date().toISOString().slice(0, 10); }

function canSend(ticketId) {
  const id    = String(ticketId);
  const now   = Date.now();
  const today = _today();
  const entry = log[id];

  if (!entry) return { allowed: true, reason: 'new ticket' };

  if (entry.date !== today) {
    log[id] = { date: today, count: 0, lastSent: 0 };
    return { allowed: true, reason: 'new day' };
  }

  if (entry.count >= MAX_PER_DAY)
    return { allowed: false, reason: `max ${MAX_PER_DAY}/day reached` };

  const elapsed = now - entry.lastSent;
  if (elapsed < MIN_GAP_MS) {
    const nextAt   = new Date(entry.lastSent + MIN_GAP_MS)
      .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const hoursAgo = (elapsed / 3_600_000).toFixed(1);
    return { allowed: false, reason: `sent ${hoursAgo}h ago — next at ${nextAt}` };
  }

  return { allowed: true, reason: `${entry.count} sent today` };
}

function markSent(ticketId) {
  const id    = String(ticketId);
  const today = _today();
  const entry = log[id];
  log[id] = {
    date:     today,
    count:    (entry?.date === today ? entry.count : 0) + 1,
    lastSent: Date.now(),
  };
  _save();
}

module.exports = { canSend, markSent };
