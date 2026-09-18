const logger = require('../logger');
const store  = require('../store');
const { getLid }                                                          = require('../lidStore');
const { fetchTicketsByStatus }                                           = require('../queries');
const { buildInsufficientMsg, buildBuildDoneMsg }                        = require('./builders');
const { canSend, markSent }                                              = require('./sentLog');
const { currentTimeIST, isWithinGeneralWindow, isWithinNewTicketWindow } = require('./timeWindow');

function toJid(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return '91' + digits + '@s.whatsapp.net';
}

function groupByPhone(rows) {
  return rows.reduce((map, row) => {
    if (!map.has(row.phone)) map.set(row.phone, []);
    map.get(row.phone).push(row);
    return map;
  }, new Map());
}

async function dispatch(sock, tickets, buildMsg, label) {
  const eligible = [];

  for (const t of tickets) {
    const { allowed, reason } = canSend(t.id);
    if (!allowed) { logger.info(`[${label}] Ticket #${t.id} skipped — ${reason}`); continue; }

    const isNew = reason === 'new ticket' || reason === 'new day';
    if (isNew && !isWithinNewTicketWindow()) {
      logger.info(`[${label}] Ticket #${t.id} new but outside 9AM-4PM — skipping`);
      continue;
    }

    logger.info(`[${label}] Ticket #${t.id} eligible — ${reason}`);
    eligible.push(t);
  }

  if (!eligible.length) {
    logger.info(`[${label}] No eligible tickets at ${currentTimeIST()}`);
    return;
  }

  for (const [phone, personTickets] of groupByPhone(eligible)) {
    const lid = getLid(phone);
    const jid = lid || toJid(phone);
    if (!jid) { logger.warn({ phone }, `[${label}] Invalid phone — skipping`); continue; }

    const text = buildMsg(personTickets);
    try {
      const sent = await sock.sendMessage(jid, { text });
      if (sent?.key?.id && sent?.message) store.save(sent.key.id, sent.message);
      for (const t of personTickets) {
        markSent(t.id);
        logger.info({ id: t.id, jid, viaLid: !!lid }, `[${label}] ✅ Sent`);
      }
    } catch (err) {
      logger.error({ err, jid }, `[${label}] ❌ Send failed`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

async function runNotifications(sock) {
  logger.info(`🔔 Notification check at ${currentTimeIST()} IST`);

  if (!isWithinGeneralWindow()) {
    logger.info('Outside 8AM-4PM — skipping');
    return;
  }

  try {
    const t = await fetchTicketsByStatus('insufficient_details');
    logger.info(`Found ${t.length} insufficient_details ticket(s)`);
    await dispatch(sock, t, buildInsufficientMsg, 'INSUFFICIENT');
  } catch (err) { logger.error({ err }, 'Error in insufficient_details run'); }

  // 3-second pause between ticket batches so phones with multiple tickets do not get overwhelmed
  await new Promise(r => setTimeout(r, 3000));

  try {
    const t = await fetchTicketsByStatus('build_done');
    logger.info(`Found ${t.length} build_done ticket(s)`);
    await dispatch(sock, t, buildBuildDoneMsg, 'BUILD_DONE');
  } catch (err) { logger.error({ err }, 'Error in build_done run'); }
}

module.exports = { runNotifications };
