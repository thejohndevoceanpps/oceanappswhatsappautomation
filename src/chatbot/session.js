const SESSION_TTL_MS = 30 * 60 * 1000;
const _sessions = new Map();

function saveSession(phone, rollno, studentname) {
  _sessions.set(phone, { rollno, studentname, expiresAt: Date.now() + SESSION_TTL_MS });
}

function getSession(phone) {
  const s = _sessions.get(phone);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { _sessions.delete(phone); return null; }
  s.expiresAt = Date.now() + SESSION_TTL_MS; // refresh TTL
  return s;
}

function deleteSession(phone) { _sessions.delete(phone); }

module.exports = { saveSession, getSession, deleteSession };
