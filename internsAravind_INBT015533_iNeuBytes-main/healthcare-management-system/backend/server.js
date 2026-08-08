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
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try { req.body = JSON.parse(req.body); } catch (e) {}
  }
  next();
});

// Serve the frontend (static HTML/CSS/JS) directly from the backend for easy local demo
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'wellframe_secret_key_2026_dev', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// API routes
app.post(['/api/auth/login', '/auth/login', '/login'], async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed', message: err.message, stack: err.stack });
  }
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/email', emailRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Healthcare Management System API is running' }));

// Fallback: send index.html for GET non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
  return res.status(404).json({ error: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Healthcare Management System API running on http://localhost:${PORT}`);
    // Proactively verify SMTP connection on startup
    await verifySmtp();
    // Initialize automated background 24h appointment reminder scheduler
    initReminderScheduler();
  });
}

module.exports = app;


