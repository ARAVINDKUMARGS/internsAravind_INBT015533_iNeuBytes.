const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// POST /api/auth/register  (patients self-register; doctors/admins created via /api/auth/register-staff by an admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, date_of_birth, gender, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    const [existingRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingRows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const [info] = await db.query(
      `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'patient', ?)`,
      [name, email, hashed, phone || null]
    );

    await db.query(
      `INSERT INTO patients (user_id, date_of_birth, gender, address) VALUES (?, ?, ?, ?)`,
      [info.insertId, date_of_birth || null, gender || null, address || null]
    );

    // Send Welcome Email asynchronously
    emailService.sendWelcomeEmail({ id: info.insertId, name, email }).catch(err => console.error(err));

    const token = signToken({ id: info.insertId, role: 'patient', name, email });
    res.status(201).json({ token, user: { id: info.insertId, name, email, role: 'patient' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/register-staff  (admin-only: create doctor or admin accounts)
router.post('/register-staff', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create staff accounts' });
  try {
    const { name, email, password, role, phone, department_id, experience_years, consultation_fee, bio } = req.body;
    if (!name || !email || !password || !['doctor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Name, email, password and a valid role (doctor/admin) are required' });
    }
    const [existingRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingRows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const [info] = await db.query(
      `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashed, role, phone || null]
    );

    if (role === 'doctor') {
      await db.query(
        `INSERT INTO doctors (user_id, department_id, experience_years, consultation_fee, bio) VALUES (?, ?, ?, ?, ?)`,
        [info.insertId, department_id || null, experience_years || 0, consultation_fee || 0, bio || null]
      );
    }

    // Send Welcome Email asynchronously
    emailService.sendWelcomeEmail({ id: info.insertId, name, email }).catch(err => console.error(err));

    res.status(201).json({ message: `${role} account created`, user_id: info.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Staff registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const [rows] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    const expiresAtStr = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)`,
      [email, token, expiresAtStr]
    );

    emailService.sendPasswordResetEmail(user, token).catch(err => console.error(err));

    res.json({ message: 'If an account exists with that email, a password reset link has been sent.', reset_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const [rows] = await db.query(
      `SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?`,
      [token, nowStr]
    );

    const resetRequest = rows[0];
    if (!resetRequest) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const hashed = bcrypt.hashSync(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, resetRequest.email]);
    await db.query('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRequest.id]);

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, phone, profile_picture, created_at FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'patient') {
      const [patientRows] = await db.query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      user.profile = patientRows[0] || null;
    } else if (user.role === 'doctor') {
      const [doctorRows] = await db.query(
        `SELECT d.*, dep.name as department_name FROM doctors d
         LEFT JOIN departments dep ON d.department_id = dep.id
         WHERE d.user_id = ?`,
        [user.id]
      );
      user.profile = doctorRows[0] || null;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both current and new password required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hashed = bcrypt.hashSync(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password update failed' });
  }
});

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

module.exports = router;

