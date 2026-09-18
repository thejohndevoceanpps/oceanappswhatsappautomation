const fs   = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', 'sessionStore', 'phone_lids.json');
let cache = {};

// Load existing mapping from disk if present
try {
  if (fs.existsSync(FILE_PATH)) {
    cache = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  }
} catch {
  cache = {};
}

function cleanPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function saveLid(phone, lid) {
  const p = cleanPhone(phone);
  if (!p || !lid || !lid.endsWith('@lid')) return;
  if (cache[p] !== lid) {
    cache[p] = lid;
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(cache, null, 2));
    } catch {}
  }
}

function getLid(phone) {
  const p = cleanPhone(phone);
  return p ? (cache[p] || null) : null;
}

module.exports = { saveLid, getLid };