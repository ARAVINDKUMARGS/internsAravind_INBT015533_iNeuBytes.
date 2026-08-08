const express = require('express');
const emailService = require('../services/emailService');
const reminderService = require('../services/reminderService');

const router = express.Router();

// GET /api/email/status - Check email service configuration & SMTP status
router.get('/status', async (req, res) => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  
  const isConfigured = Boolean(user && (process.env.EMAIL_PASS || process.env.SMTP_PASS));
  let verifyResult = { verified: false };

  if (isConfigured) {
    verifyResult = await emailService.verifySmtp();
  }

  res.json({
    configured: isConfigured,
    smtp_host: host,
    smtp_port: port,
    smtp_user_configured: Boolean(user),
    smtp_verified: verifyResult.verified,
    message: isConfigured 
      ? (verifyResult.verified ? 'SMTP is connected and verified.' : `SMTP configuration error: ${verifyResult.reason}`)
      : 'SMTP credentials missing in .env. Running in Console Log mode.'
  });
});

// POST /api/email/test - Development email test mechanism
router.post('/test', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid recipient email address is required in body ({ "email": "user@example.com" })' });
  }

  console.log(`[EMAIL TEST] Received request to send test email to: ${email}`);

  const result = await emailService.sendEmail({
    to: email,
    subject: 'Hospital Management System - Test Email',
    text: 'This is a test email from the Hospital Management System.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #17847a; border-radius: 8px;">
        <h2 style="color: #17847a;">🏥 Wellframe Clinic - Email System Test</h2>
        <p>This is a test email sent from your <strong>Hospital Management System</strong>.</p>
        <p>If you are reading this email in your inbox, your Nodemailer SMTP configuration is working perfectly!</p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `
  });

  if (result.success) {
    return res.json({
      success: true,
      message: result.simulated ? 'Test email logged to console (SMTP credentials missing in .env)' : 'Test email sent successfully',
      details: result
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Email sending failed',
      error: result.error || 'SMTP delivery failed'
    });
  }
});

// POST /api/email/trigger-reminders - Development endpoint to test 24-hour reminders instantly
router.post('/trigger-reminders', async (req, res) => {
  console.log('[EMAIL TEST] Manually triggering 24-hour appointment reminder check...');
  try {
    const force = req.body.force !== undefined ? Boolean(req.body.force) : true;
    const sentCount = await reminderService.checkAndSendReminders(force);
    res.json({
      success: true,
      message: `Processed reminder check. ${sentCount} reminder email(s) sent/logged.`,
      reminders_sent: sentCount
    });
  } catch (err) {
    console.error('[EMAIL ERROR] Manual reminder trigger failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to process reminder check', error: err.message });
  }
});

module.exports = router;
