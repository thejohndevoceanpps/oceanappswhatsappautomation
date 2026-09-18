const APP_NAME = process.env.APP_NAME || 'OceanApps';

function _istHour() {
  const now   = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 5.5 * 3_600_000).getHours();
}

function timeGreeting() {
  const h = _istHour();
  if (h >= 5  && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function buildGreetingMsg(studentName) {
  return [
    timeGreeting() + '! 👋',
    '',
    'Welcome to *' + APP_NAME + '*!',
    'Nice to see you, *' + studentName + '* 😊',
    '',
    'How can we help you today?',
  ].join('\n');
}

function buildMenuMsg() {
  return [
    '📋 *Please choose a service:*',
    '',
    '1️⃣  *Fees*     — View your unpaid fee details',
    '2️⃣  *Results*  — View your exam results',
    '3️⃣  *Enroll*   — Enrol in a new course',
    '',
    '_Reply with a number or keyword, e.g. *1* or *Fees*_',
  ].join('\n');
}

function buildFeesMsg(studentName, fees) {
  if (!fees.length) {
    return [
      '💰 *Unpaid Fees — ' + studentName + '*',
      '',
      '✅ No pending fees. You are all clear!',
      '_Contact the accounts office for any queries._',
    ].join('\n');
  }

  const lines = fees.map((f, i) => {
    const batch  = f.feebatch || '—';
    const amount = f.amount != null
      ? '₹' + Number(f.amount).toLocaleString('en-IN')
      : '—';
    return (i + 1) + ') ```' + batch + '```\n   Amount : *' + amount + '*';
  });

  const total    = fees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalStr = '₹' + total.toLocaleString('en-IN');

  return [
    '💰 *Unpaid Fees — ' + studentName + '*',
    '',
    ...lines,
    '',
    '──────────────────',
    '💳 *Total Due : ' + totalStr + '*',
    '',
    '_Please pay at the earliest to avoid late charges._',
    '_Contact the accounts office for any queries._',
  ].join('\n');
}

const NOT_A_STUDENT_MSG = [
  'Sorry! 🙏',
  'This WhatsApp is *only for students*.',
  'Please contact your institution for assistance.',
].join('\n');

const SESSION_EXPIRED_MSG = [
  'Your session has expired. ⏰',
  'Please send *Hi* to start again 😊',
].join('\n');

const COMING_SOON_MSG = (feature) => [
  '_' + feature + '_ feature is *coming soon!* 🚀',
  '',
  'Please check the student portal in the meantime.',
].join('\n');

module.exports = {
  buildGreetingMsg, buildMenuMsg, buildFeesMsg,
  NOT_A_STUDENT_MSG, SESSION_EXPIRED_MSG, COMING_SOON_MSG,
};
