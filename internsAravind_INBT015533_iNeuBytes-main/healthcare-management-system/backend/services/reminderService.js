const cron = require('node-cron');
const db = require('../config/db');
const emailService = require('./emailService');

/**
 * Checks for appointments scheduled in the next 24 hours that haven't received a reminder yet.
 * @param {boolean} forceAllUnsent - If true (dev test mode), includes all unsent upcoming appointments regardless of exact 24h window.
 */
async function checkAndSendReminders(forceAllUnsent = false) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status,
             pu.name as patient_name, pu.email as patient_email,
             du.name as doctor_name, dep.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users du ON doc.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      WHERE (a.reminder_sent IS NULL OR a.reminder_sent = 0)
        AND a.status IN ('pending', 'confirmed')
    `;

    const params = [];
    if (!forceAllUnsent) {
      query += ` AND (a.appointment_date = ? OR a.appointment_date = ?)`;
      params.push(tomorrowStr, todayStr);
    }

    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;

    const [appointments] = await db.query(query, params);

    if (!appointments || appointments.length === 0) {
      console.log(`[ReminderService] No pending 24h appointment reminders to send.`);
      return 0;
    }

    let sentCount = 0;
    for (const appt of appointments) {
      if (!appt.patient_email) {
        console.error(`[EMAIL ERROR] Cannot send 24h reminder for appointment ID #${appt.id}: Missing patient email address.`);
        continue;
      }

      console.log(`[EMAIL] Processing 24h reminder for Appointment #${appt.id} (Patient: ${appt.patient_email}, Date: ${appt.appointment_date})`);

      const result = await emailService.sendAppointmentReminderEmail(
        { name: appt.patient_name, email: appt.patient_email },
        appt
      );

      if (result && result.success) {
        await db.query(`UPDATE appointments SET reminder_sent = 1 WHERE id = ?`, [appt.id]);
        sentCount++;
      }
    }

    console.log(`[ReminderService] Successfully processed and sent ${sentCount} appointment reminders.`);
    return sentCount;
  } catch (err) {
    console.error('[EMAIL ERROR] [ReminderService] Failed to execute appointment reminder check:', err.message);
    return 0;
  }
}

/**
 * Starts the automated cron scheduler.
 * Runs every hour to check and trigger 24h reminders.
 */
function initReminderScheduler() {
  // Run on schedule: top of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[ReminderService] Running scheduled 24-hour appointment reminder check...');
    await checkAndSendReminders(false);
  });

  // Run initial check 10 seconds after server startup
  setTimeout(async () => {
    console.log('[ReminderService] Running startup appointment reminder check...');
    await checkAndSendReminders(false);
  }, 10000);

  console.log('[ReminderService] Scheduled 24h appointment reminder background task initialized.');
}

module.exports = {
  checkAndSendReminders,
  initReminderScheduler
};
