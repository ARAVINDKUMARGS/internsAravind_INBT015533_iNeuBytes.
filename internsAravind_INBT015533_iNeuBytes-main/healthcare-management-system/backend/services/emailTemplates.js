/**
 * Responsive HTML and Plain Text Email Templates for Healthcare Management System
 */

const CLINIC_NAME = 'Wellframe Clinic';
const BRAND_COLOR = '#17847a';
const BRAND_DARK = '#0f524c';
const BG_COLOR = '#f4f8f7';
const TEXT_COLOR = '#1e293b';

function layout(contentHtml, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CLINIC_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: ${TEXT_COLOR}; line-height: 1.6; }
    .wrapper { width: 100%; background-color: ${BG_COLOR}; padding: 30px 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_DARK}); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .btn { display: inline-block; padding: 12px 26px; background-color: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin-top: 20px; text-align: center; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .details-table th, .details-table td { padding: 12px 16px; text-align: left; font-size: 14px; }
    .details-table th { background: #eef6f5; color: ${BRAND_DARK}; font-weight: 600; width: 35%; border-bottom: 1px solid #e2e8f0; }
    .details-table td { border-bottom: 1px solid #e2e8f0; color: #334155; }
    .details-table tr:last-child th, .details-table tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .badge-confirmed { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: ${BRAND_COLOR}; text-decoration: none; }
    .alert-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #1e40af; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🏥 ${CLINIC_NAME}</h1>
        <p>Healthcare & Clinic Management System</p>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p><strong>${CLINIC_NAME}</strong> • 12 Anna Salai, Chennai, Tamil Nadu 600002</p>
        <p>Phone: +91 98765 43210 | Email: care@wellframeclinic.com</p>
        <p>© ${new Date().getFullYear()} ${CLINIC_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  // 1. Welcome Email
  welcome({ name, email, portalUrl }) {
    const html = layout(`
      <h2>Welcome to ${CLINIC_NAME}, ${name}! 👋</h2>
      <p>Thank you for registering your account with us. We are dedicated to offering you seamless, compassionate, and personalized healthcare.</p>
      <p>With your new account, you can easily:</p>
      <ul>
        <li>Book and schedule appointments with specialist doctors.</li>
        <li>Track your upcoming visits and consultation statuses.</li>
        <li>Access your personal patient dashboard anytime.</li>
      </ul>
      <div class="alert-box">
        <strong>Account Details:</strong><br>
        Name: ${name}<br>
        Registered Email: ${email}
      </div>
      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Log In to Your Dashboard</a>
      </div>
    `, `Welcome to ${CLINIC_NAME}, ${name}! Your account is ready.`);

    const text = `Welcome to ${CLINIC_NAME}, ${name}!\n\nThank you for registering. You can log into your account at ${portalUrl} to book appointments and manage your healthcare.`;
    return { html, text, subject: `Welcome to ${CLINIC_NAME}!` };
  },

  // 2. Appointment Confirmation (Patient)
  appointmentConfirmation({ patientName, doctorName, departmentName, appointmentDate, appointmentTime, status, message, portalUrl }) {
    const html = layout(`
      <h2>Appointment Confirmation 📅</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Your appointment request with <strong>${CLINIC_NAME}</strong> has been successfully received.</p>
      
      <table class="details-table">
        <tr><th>Patient Name</th><td>${patientName}</td></tr>
        <tr><th>Assigned Doctor</th><td>${doctorName}</td></tr>
        <tr><th>Department</th><td>${departmentName || 'General Medicine'}</td></tr>
        <tr><th>Date</th><td>${appointmentDate}</td></tr>
        <tr><th>Time Slot</th><td>${appointmentTime}</td></tr>
        <tr><th>Status</th><td><span class="badge badge-${status}">${status}</span></td></tr>
        ${message ? `<tr><th>Message / Notes</th><td>${message}</td></tr>` : ''}
      </table>

      <p>Please arrive at least 15 minutes prior to your scheduled time slot.</p>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">View Appointment Details</a>
      </div>
    `, `Appointment confirmation for ${appointmentDate} at ${appointmentTime}`);

    const text = `Hello ${patientName},\n\nYour appointment with ${doctorName} (${departmentName}) on ${appointmentDate} at ${appointmentTime} has been received (Status: ${status}).\n\nView details: ${portalUrl}`;
    return { html, text, subject: `Appointment Confirmation - ${appointmentDate} (${appointmentTime})` };
  },

  // 3. Doctor Appointment Notification
  doctorNotification({ doctorName, patientName, patientPhone, departmentName, appointmentDate, appointmentTime, message, portalUrl }) {
    const html = layout(`
      <h2>New Appointment Scheduled 🩺</h2>
      <p>Dear <strong>${doctorName}</strong>,</p>
      <p>A new appointment has been scheduled for your schedule. Below are the details:</p>

      <table class="details-table">
        <tr><th>Patient Name</th><td>${patientName}</td></tr>
        <tr><th>Contact Phone</th><td>${patientPhone || 'Not provided'}</td></tr>
        <tr><th>Department</th><td>${departmentName || 'General'}</td></tr>
        <tr><th>Date</th><td>${appointmentDate}</td></tr>
        <tr><th>Time Slot</th><td>${appointmentTime}</td></tr>
        ${message ? `<tr><th>Patient Notes</th><td>${message}</td></tr>` : ''}
      </table>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Open Doctor Dashboard</a>
      </div>
    `, `New appointment with ${patientName} on ${appointmentDate}`);

    const text = `Dear ${doctorName},\n\nYou have a new appointment with patient ${patientName} on ${appointmentDate} at ${appointmentTime}.\n\nView dashboard: ${portalUrl}`;
    return { html, text, subject: `New Appointment Booking - ${patientName} (${appointmentDate})` };
  },

  // 4. Appointment Reminder (24 Hours Before)
  appointmentReminder({ patientName, doctorName, departmentName, appointmentDate, appointmentTime, portalUrl }) {
    const html = layout(`
      <h2>Upcoming Appointment Reminder ⏰</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>This is a friendly reminder that you have an upcoming appointment scheduled tomorrow at <strong>${CLINIC_NAME}</strong>.</p>

      <table class="details-table">
        <tr><th>Doctor</th><td>${doctorName}</td></tr>
        <tr><th>Department</th><td>${departmentName || 'General Medicine'}</td></tr>
        <tr><th>Date</th><td><strong>${appointmentDate}</strong></td></tr>
        <tr><th>Time</th><td><strong>${appointmentTime}</strong></td></tr>
        <tr><th>Location</th><td>12 Anna Salai, Chennai</td></tr>
      </table>

      <div class="alert-box">
        <strong>Important:</strong> If you need to reschedule or cancel your visit, please update your appointment at least 4 hours in advance via your dashboard.
      </div>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Manage My Appointment</a>
      </div>
    `, `Reminder: Appointment with ${doctorName} tomorrow at ${appointmentTime}`);

    const text = `Reminder: Hello ${patientName}, you have an appointment with ${doctorName} tomorrow on ${appointmentDate} at ${appointmentTime}.\n\nManage appointment: ${portalUrl}`;
    return { html, text, subject: `Reminder: Upcoming Appointment Tomorrow (${appointmentTime})` };
  },

  // 5. Appointment Cancellation
  appointmentCancellation({ recipientName, doctorName, patientName, appointmentDate, appointmentTime, reason, portalUrl }) {
    const html = layout(`
      <h2>Appointment Cancellation Notice ❌</h2>
      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>This email is to notify you that the following appointment has been <strong>cancelled</strong>.</p>

      <table class="details-table">
        <tr><th>Patient</th><td>${patientName}</td></tr>
        <tr><th>Doctor</th><td>${doctorName}</td></tr>
        <tr><th>Date</th><td>${appointmentDate}</td></tr>
        <tr><th>Time</th><td>${appointmentTime}</td></tr>
        <tr><th>Status</th><td><span class="badge badge-cancelled">Cancelled</span></td></tr>
        ${reason ? `<tr><th>Reason</th><td>${reason}</td></tr>` : ''}
      </table>

      <p>If this was cancelled by mistake or you wish to schedule a new visit, please visit your portal to rebook.</p>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Book New Appointment</a>
      </div>
    `, `Appointment on ${appointmentDate} has been cancelled`);

    const text = `Notice: The appointment on ${appointmentDate} at ${appointmentTime} between ${patientName} and ${doctorName} has been cancelled.\n\nBook a new appointment: ${portalUrl}`;
    return { html, text, subject: `Notice: Appointment Cancelled (${appointmentDate})` };
  },

  // 6. Password Reset Link
  passwordReset({ name, resetUrl }) {
    const html = layout(`
      <h2>Password Reset Request 🔐</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>We received a request to reset the password for your <strong>${CLINIC_NAME}</strong> account.</p>
      <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">If the button does not work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}">${resetUrl}</a></p>

      <div class="alert-box" style="background:#fef2f2; border-color:#ef4444; color:#991b1b;">
        <strong>Didn't request this?</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </div>
    `, `Password reset request for ${CLINIC_NAME}`);

    const text = `Hello ${name},\n\nYou requested a password reset for ${CLINIC_NAME}. Use the following link within 1 hour to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
    return { html, text, subject: `Password Reset Request - ${CLINIC_NAME}` };
  },

  // 7. Enquiry Acknowledgement
  enquiryAcknowledgement({ patient_name, department, phone, message }) {
    const html = layout(`
      <h2>Enquiry Received ✉️</h2>
      <p>Dear <strong>${patient_name}</strong>,</p>
      <p>Thank you for reaching out to <strong>${CLINIC_NAME}</strong>. We have received your appointment enquiry.</p>
      <p>Our patient care coordination team is reviewing your message and will contact you at <strong>${phone}</strong> shortly.</p>

      <table class="details-table">
        <tr><th>Patient Name</th><td>${patient_name}</td></tr>
        <tr><th>Phone Number</th><td>${phone}</td></tr>
        <tr><th>Preferred Department</th><td>${department || 'General Medicine'}</td></tr>
        ${message ? `<tr><th>Message</th><td>${message}</td></tr>` : ''}
      </table>

      <p>We look forward to assisting you!</p>
    `, `We received your enquiry - ${CLINIC_NAME}`);

    const text = `Hello ${patient_name},\n\nThank you for contacting ${CLINIC_NAME}. We have received your enquiry for ${department || 'General Medicine'} and will call you at ${phone} shortly.\n\nBest regards,\n${CLINIC_NAME}`;
    return { html, text, subject: `Enquiry Acknowledgement - ${CLINIC_NAME}` };
  }
};
