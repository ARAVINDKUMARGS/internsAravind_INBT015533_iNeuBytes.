const nodemailer = require('nodemailer');
const emailTemplates = require('./emailTemplates');
require('dotenv').config();

// Determine default app / frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5000';

let transporter = null;

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];
  const maskedUser = user.length > 2 ? user.substring(0, 2) + '***' : '***';
  return `${maskedUser}@${domain}`;
}

/**
 * Lazy initialization of Nodemailer SMTP Transporter
 */
function getTransporter() {
  if (transporter) return transporter;

  console.log('[EMAIL] Initializing email service...');

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const secure = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE) === 'true' || port === 465;

  if (user && pass) {
    console.log('[EMAIL] SMTP configuration loaded');
    console.log(`[EMAIL] Host: ${host}:${port} | Secure: ${secure} | User: ${maskEmail(user)}`);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    return transporter;
  } else {
    console.warn('[EMAIL ERROR] SMTP credentials missing');
    console.warn('[EMAIL] Running in Console Log mode. Add EMAIL_USER and EMAIL_PASS to backend/.env to send real emails.');
    return null;
  }
}

/**
 * Verifies SMTP connection and authentication proactively on server boot.
 */
async function verifySmtp() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[EMAIL ERROR] SMTP credentials missing');
    return { verified: false, reason: 'SMTP credentials missing in .env' };
  }

  const activeTransporter = getTransporter();
  if (!activeTransporter) return { verified: false, reason: 'Transporter creation failed' };

  console.log('[EMAIL] Verifying SMTP connection...');
  try {
    await activeTransporter.verify();
    console.log('[EMAIL] SMTP connection verified successfully');
    return { verified: true };
  } catch (error) {
    console.error('[EMAIL ERROR] SMTP verification failed:', error.message);
    if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted') || error.code === 'EAUTH') {
      console.error('[EMAIL ERROR] SMTP authentication failed');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('[EMAIL ERROR] SMTP connection failed');
    }
    return { verified: false, reason: error.message };
  }
}

/**
 * Core sendEmail handler with diagnostics and fallback.
 */
async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || `"Hospital Management System" <no-reply@wellframeclinic.com>`;

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.error(`[EMAIL ERROR] Invalid recipient: ${to}`);
    return { success: false, error: `Invalid recipient: ${to}` };
  }

  console.log(`[EMAIL] Sending email: "${subject}"`);
  console.log(`[EMAIL] Recipient: ${maskEmail(to)}`);

  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log(`\n================== [CONSOLE EMAIL LOG (NO SMTP CONFIGURED)] ==================`);
    console.log(`TO: ${to}`);
    console.log(`FROM: ${from}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY (TEXT):\n${text}`);
    console.log(`=============================================================================\n`);
    console.log(`[EMAIL] Simulated email logged to console successfully for recipient: ${to}`);
    return { success: true, simulated: true, message: 'Logged to console (SMTP credentials missing in .env)' };
  }

  try {
    const info = await activeTransporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log(`[EMAIL] Email sent successfully`);
    return { success: true, messageId: info.messageId, recipient: to };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${maskEmail(to)}:`, error.message);
    if (error.code === 'EAUTH') {
      console.error('[EMAIL ERROR] SMTP authentication failed');
    }
    return { success: false, error: error.message };
  }
}

/**
 * 1. Send Welcome Email on User Registration
 * Recipient: Newly registered user's email
 */
async function sendWelcomeEmail(user) {
  if (!user || !user.email) {
    console.error('[EMAIL ERROR] Cannot send Welcome Email: User email is missing.');
    return { success: false, error: 'User email is missing' };
  }
  console.log(`[EMAIL] Sending Welcome Email to registered user: ${maskEmail(user.email)}`);
  const portalUrl = `${FRONTEND_URL}/login.html`;
  const tpl = emailTemplates.welcome({
    name: user.name || 'Valued Patient',
    email: user.email,
    portalUrl
  });
  return sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 2. Send Appointment Confirmation Email to Patient
 * Recipient: Patient's registered email
 */
async function sendAppointmentConfirmationEmail(patient, appt) {
  const recipientEmail = patient?.email || appt?.patient_email;
  if (!recipientEmail) {
    console.error('[EMAIL ERROR] Cannot send Appointment Confirmation: Patient email missing.');
    return { success: false, error: 'Patient email missing' };
  }
  console.log(`[EMAIL] Sending Appointment Confirmation to patient: ${maskEmail(recipientEmail)}`);
  const portalUrl = `${FRONTEND_URL}/patient-dashboard.html`;
  const tpl = emailTemplates.appointmentConfirmation({
    patientName: patient?.name || appt?.patient_name || 'Patient',
    doctorName: appt?.doctor_name || 'Doctor',
    departmentName: appt?.department_name || 'General Medicine',
    appointmentDate: appt?.appointment_date || 'Upcoming',
    appointmentTime: appt?.appointment_time || 'Scheduled Time',
    status: appt?.status || 'pending',
    message: appt?.message,
    portalUrl
  });
  return sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 3. Send Doctor Appointment Notification
 * Recipient: Assigned doctor's registered email
 */
async function sendDoctorAppointmentNotification(doctor, appt) {
  const recipientEmail = doctor?.email || appt?.doctor_email;
  if (!recipientEmail) {
    console.error('[EMAIL ERROR] Cannot send Doctor Notification: Doctor email missing.');
    return { success: false, error: 'Doctor email missing' };
  }
  console.log(`[EMAIL] Sending Doctor Booking Notification to doctor: ${maskEmail(recipientEmail)}`);
  const portalUrl = `${FRONTEND_URL}/doctor-dashboard.html`;
  const tpl = emailTemplates.doctorNotification({
    doctorName: doctor?.name || appt?.doctor_name || 'Doctor',
    patientName: appt?.patient_name || 'Patient',
    patientPhone: appt?.patient_phone,
    departmentName: appt?.department_name || 'General',
    appointmentDate: appt?.appointment_date || 'Date',
    appointmentTime: appt?.appointment_time || 'Time',
    message: appt?.message,
    portalUrl
  });
  return sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 4. Send 24-Hour Appointment Reminder Email
 * Recipient: Patient's registered email
 */
async function sendAppointmentReminderEmail(patient, appt) {
  const recipientEmail = patient?.email || appt?.patient_email;
  if (!recipientEmail) {
    console.error('[EMAIL ERROR] Cannot send Appointment Reminder: Patient email missing.');
    return { success: false, error: 'Patient email missing' };
  }
  console.log(`[EMAIL] Sending Appointment Reminder (24h) to patient: ${maskEmail(recipientEmail)}`);
  const portalUrl = `${FRONTEND_URL}/patient-dashboard.html`;
  const tpl = emailTemplates.appointmentReminder({
    patientName: patient?.name || appt?.patient_name || 'Patient',
    doctorName: appt?.doctor_name || 'Doctor',
    departmentName: appt?.department_name || 'General Medicine',
    appointmentDate: appt?.appointment_date || 'Tomorrow',
    appointmentTime: appt?.appointment_time || 'Time',
    portalUrl
  });
  return sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 5. Send Appointment Cancellation Email
 * Recipient: Patient's / Doctor's registered email
 */
async function sendAppointmentCancellationEmail(recipient, appt, reason = '') {
  if (!recipient || !recipient.email) {
    console.error('[EMAIL ERROR] Cannot send Appointment Cancellation: Recipient email missing.');
    return { success: false, error: 'Recipient email missing' };
  }
  console.log(`[EMAIL] Sending Appointment Cancellation to: ${maskEmail(recipient.email)}`);
  const portalUrl = `${FRONTEND_URL}/login.html`;
  const tpl = emailTemplates.appointmentCancellation({
    recipientName: recipient.name || 'User',
    patientName: appt?.patient_name || 'Patient',
    doctorName: appt?.doctor_name || 'Doctor',
    appointmentDate: appt?.appointment_date || 'Date',
    appointmentTime: appt?.appointment_time || 'Time',
    reason,
    portalUrl
  });
  return sendEmail({
    to: recipient.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 6. Send Password Reset Link Email
 * Recipient: User's email requesting reset
 */
async function sendPasswordResetEmail(user, token) {
  if (!user || !user.email) {
    console.error('[EMAIL ERROR] Cannot send Password Reset: User email missing.');
    return { success: false, error: 'User email missing' };
  }
  console.log(`[EMAIL] Sending Password Reset email to: ${maskEmail(user.email)}`);
  const resetUrl = `${FRONTEND_URL}/reset-password.html?token=${token}`;
  const tpl = emailTemplates.passwordReset({
    name: user.name || 'User',
    resetUrl
  });
  return sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

/**
 * 7. Send Enquiry Acknowledgement Email
 * Recipient: Email entered in enquiry form
 */
async function sendEnquiryAcknowledgementEmail(enquiry) {
  if (!enquiry || !enquiry.email) {
    console.error('[EMAIL ERROR] Cannot send Enquiry Acknowledgement: Inquirer email missing.');
    return { success: false, error: 'Inquirer email missing' };
  }
  console.log(`[EMAIL] Sending Enquiry Acknowledgement to: ${maskEmail(enquiry.email)}`);
  const tpl = emailTemplates.enquiryAcknowledgement({
    patient_name: enquiry.patient_name || 'Inquirer',
    department: enquiry.department || 'General Medicine',
    phone: enquiry.phone || 'Phone',
    message: enquiry.message
  });
  return sendEmail({
    to: enquiry.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
}

module.exports = {
  getTransporter,
  verifySmtp,
  sendEmail,
  sendWelcomeEmail,
  sendAppointmentConfirmationEmail,
  sendDoctorAppointmentNotification,
  sendAppointmentReminderEmail,
  sendAppointmentCancellationEmail,
  sendPasswordResetEmail,
  sendEnquiryAcknowledgementEmail
};
