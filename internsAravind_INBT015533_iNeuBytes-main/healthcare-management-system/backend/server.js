require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const doctorRoutes = require('./routes/doctors');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const enquiryRoutes = require('./routes/enquiries');
const emailRoutes = require('./routes/email');
const { verifySmtp } = require('./services/emailService');
const { initReminderScheduler } = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend (static HTML/CSS/JS) directly from the backend for easy local demo
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/email', emailRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Healthcare Management System API is running' }));

// Fallback: send index.html for unknown non-API routes (simple SPA-ish routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Healthcare Management System API running on http://localhost:${PORT}`);
  // Proactively verify SMTP connection on startup
  await verifySmtp();
  // Initialize automated background 24h appointment reminder scheduler
  initReminderScheduler();
});


