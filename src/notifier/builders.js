function buildInsufficientMsg(tickets) {
  const lines = tickets.map((t, i) => `  ${i + 1}. ${t.title}`);
  return [
    '⚠️ *Action Required — More Details Needed*',
    '',
    `The following ticket${tickets.length > 1 ? 's require' : ' requires'} more information:`,
    ...lines,
    '',
    'Please reply with additional details so we can process your request. 🙏',
  ].join('\n');
}

function buildBuildDoneMsg(tickets) {
  const lines = tickets.map((t, i) => `  ${i + 1}. [#${t.id}] ${t.title}`);
  return [
    `✅ *Your Ticket${tickets.length > 1 ? 's Are' : ' Is'} Ready to Close*`,
    '',
    `The following ticket${tickets.length > 1 ? 's have' : ' has'} been marked *Build Done*. Please verify and close them:`,
    ...lines,
    '',
    'Login to the portal and close the ticket once you confirm the fix is working. Thank you! 👍',
  ].join('\n');
}

module.exports = { buildInsufficientMsg, buildBuildDoneMsg };
