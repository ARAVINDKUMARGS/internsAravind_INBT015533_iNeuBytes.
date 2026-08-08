const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// POST /api/enquiries - public appointment enquiry form (landing page)
router.post('/', async (req, res) => {
  const { patient_name, email, phone, department, message } = req.body;
  if (!patient_name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email and phone are required' });
  }
  try {
    const [info] = await db.query(
      `INSERT INTO enquiries (patient_name, email, phone, department, message) VALUES (?, ?, ?, ?, ?)`,
      [patient_name, email, phone, department || null, message || null]
    );

    // Send Enquiry Acknowledgement Email asynchronously
    emailService.sendEnquiryAcknowledgementEmail({
      patient_name,
      email,
      phone,
      department,
      message
    }).catch(err => console.error(err));

    res.status(201).json({ id: info.insertId, message: 'Thank you! We will get back to you shortly.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});

// GET /api/enquiries - admin only
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM enquiries ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve enquiries' });
  }
});

module.exports = router;

