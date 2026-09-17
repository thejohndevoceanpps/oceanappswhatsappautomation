const TEST_MODE = process.env.TEST_MODE === 'true';

function nowIST() {
  const now   = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 5.5 * 3_600_000);
}

function currentTimeIST() {
  return nowIST().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isWithinGeneralWindow() {
  if (TEST_MODE) return true;
  const h = nowIST().getHours();
  return h >= 8 && h < 16;
}

function isWithinNewTicketWindow() {
  if (TEST_MODE) return true;
  const h = nowIST().getHours();
  return h >= 9 && h < 16;
}

module.exports = { TEST_MODE, currentTimeIST, isWithinGeneralWindow, isWithinNewTicketWindow };
