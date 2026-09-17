/**
 * chatbot/index.js - Incoming WhatsApp message router.
 *
 * E2EE "Waiting for this message" fix:
 *   All replies use { quoted: incomingMsg } — this makes Baileys reuse the
 *   existing Signal session established when the message was received,
 *   instead of starting a new key exchange (which fails for first-time contacts).
 *   Every sent message is saved to store.js for getMessage() retry support.
 */

const logger = require('../logger');
const store  = require('../store');
const { findStudentByPhone, fetchUnpaidFees } = require('../queries');
const { saveSession, getSession }             = require('./session');
const {
  buildGreetingMsg, buildMenuMsg, buildFeesMsg,
  NOT_A_STUDENT_MSG, SESSION_EXPIRED_MSG, COMING_SOON_MSG,
} = require('./builders');

// ─── Intent patterns ───────────────────────────────────────────────────────
const INTENTS = {
  greeting: /^\s*(hi+|hello|hey|good\s*(morning|afternoon|evening|night))\s*[!.?]*\s*$/i,
  fees:     /^\s*(fees?|fee details?|my fees?|1)\s*[!.?]*\s*$/i,
  results:  /^\s*(results?|my results?|marks?|2)\s*[!.?]*\s*$/i,
  enroll:   /^\s*(enroll?|enrollment?|admission|3)\s*[!.?]*\s*$/i,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractText(msg) {
  return (
    msg.message?.conversation                              ||
    msg.message?.extendedTextMessage?.text                 ||
    msg.message?.imageMessage?.caption                     ||
    msg.message?.buttonsResponseMessage?.selectedDisplayText ||
    msg.message?.listResponseMessage?.title                ||
    ''
  ).trim();
}

function extractPhone(msg) {
  const raw    = msg.key.senderPn || msg.key.remoteJid || '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 10) return digits;
  return null;
}

function classify(text) {
  for (const [intent, pattern] of Object.entries(INTENTS)) {
    if (pattern.test(text)) return intent;
  }
  return null;
}

/**
 * Send a reply quoted to the incoming message.
 * Quoting reuses the existing E2EE session — prevents "Waiting for this message".
 * Saves the sent message to the store for getMessage() retry support.
 */
async function send(sock, jid, text, incomingMsg) {
  const sent = await sock.sendMessage(jid, { text }, { quoted: incomingMsg });
  if (sent?.key?.id && sent?.message) store.save(sent.key.id, sent.message);
  return sent;
}

// ─── Intent handlers ───────────────────────────────────────────────────────

async function onGreeting(sock, jid, phone, msg) {
  logger.info({ phone }, '📨 Greeting received');
  const student = await findStudentByPhone(phone);

  if (!student) {
    logger.info({ phone }, '🚫 Not a student — sending rejection');
    await send(sock, jid, NOT_A_STUDENT_MSG, msg);
    return;
  }

  saveSession(phone, student.rollno, student.studentname);
  logger.info({ phone, name: student.studentname, rollno: student.rollno }, '✅ Student found');

  await send(sock, jid, buildGreetingMsg(student.studentname), msg);
  await new Promise(r => setTimeout(r, 800));
  await send(sock, jid, buildMenuMsg(), msg);
}

async function onFees(sock, jid, phone, session, msg) {
  logger.info({ phone, rollno: session.rollno }, '💰 Fees requested');
  const fees = await fetchUnpaidFees(session.rollno);
  logger.info({ count: fees.length }, 'Unpaid fees fetched');
  await send(sock, jid, buildFeesMsg(session.studentname, fees), msg);
  await new Promise(r => setTimeout(r, 600));
  await send(sock, jid, buildMenuMsg(), msg);
}

async function onComingSoon(sock, jid, feature, msg) {
  await send(sock, jid, COMING_SOON_MSG(feature), msg);
  await new Promise(r => setTimeout(r, 600));
  await send(sock, jid, buildMenuMsg(), msg);
}

// ─── Main entry ───────────────────────────────────────────────────────────

async function handleIncoming(sock, upsert) {
  if (upsert.type !== 'notify') return;

  for (const msg of upsert.messages) {
    if (msg.key?.id && msg.message) {
      store.save(msg.key.id, msg.message);
    }

    if (msg.key.fromMe) continue;

    const jid = msg.key.remoteJid || '';
    if (jid.endsWith('@g.us')) continue;         // skip group chats

    const text = extractText(msg);
    if (!text) continue;

    const intent = classify(text);
    if (!intent) continue;

    const phone = extractPhone(msg);
    if (!phone) {
      logger.warn({ jid, senderPn: msg.key.senderPn }, 'Could not extract phone — skipping');
      continue;
    }

    logger.info({ jid, phone, text, intent }, '→ Message classified');

    try {
      if (intent === 'greeting') {
        await onGreeting(sock, jid, phone, msg);
        continue;
      }

      const session = getSession(phone);
      if (!session) {
        logger.info({ phone }, 'No active session — asking to say Hi first');
        await send(sock, jid, SESSION_EXPIRED_MSG, msg);
        continue;
      }

      if (intent === 'fees')    { await onFees(sock, jid, phone, session, msg); continue; }
      if (intent === 'results') { await onComingSoon(sock, jid, 'Results',    msg); continue; }
      if (intent === 'enroll')  { await onComingSoon(sock, jid, 'Enrollment', msg); continue; }
      
    } catch (err) {
      logger.error({ err, jid, phone, intent }, '❌ Error handling message');
    }
  }
}

module.exports = { handleIncoming };
