/**
 * queries.js - All database queries (notifications + chatbot).
 */
const pool = require('./db');

// ─── Ticket notifications ──────────────────────────────────────────────────

async function fetchTicketsByStatus(status) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.title, t.status, t.raised_by, e.phone
       FROM tbltickets t
       JOIN tblemp     e ON e.email = t.raised_by
      WHERE t.status = ?
        AND e.phone IS NOT NULL
        AND e.phone != ''`,
    [status]
  );
  return rows;
}

// ─── Student chatbot ───────────────────────────────────────────────────────

/**
 * Find a student by their 10-digit phone number.
 * Joins tblemp (emprole=12) with tblstudents via empname = rollno.
 * @param {string} phone  10 digits, no country code
 * @returns {{ studentname: string, rollno: string } | null}
 */
async function findStudentByPhone(phone) {
  const [rows] = await pool.execute(
    `SELECT s.studentname, s.rollno
       FROM tblemp      e
       JOIN tblstudents s ON s.rollno = e.empname
      WHERE e.emprole = 12
        AND e.phone   = ?
      LIMIT 1`,
    [phone]
  );
  return rows[0] || null;
}

/**
 * Fetch unpaid fees for a student (status = 'notpaid').
 * @param {string} rollno
 */
async function fetchUnpaidFees(rollno) {
  const [rows] = await pool.execute(
    `SELECT id, feebatch, amount, remarks, createdon
       FROM tblfeemaster
      WHERE rollno = ?
        AND status = 'notpaid'
      ORDER BY createdon DESC`,
    [rollno]
  );
  return rows;
}

module.exports = { fetchTicketsByStatus, findStudentByPhone, fetchUnpaidFees };
