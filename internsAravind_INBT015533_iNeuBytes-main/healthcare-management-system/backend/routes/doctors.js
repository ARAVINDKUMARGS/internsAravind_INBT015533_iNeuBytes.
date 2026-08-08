const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const DOCTOR_SELECT = `
  SELECT doc.id, doc.experience_years, doc.consultation_fee, doc.available_slots, doc.bio,
         u.id as user_id, u.name, u.email, u.phone, u.profile_picture,
         dep.id as department_id, dep.name as department_name
  FROM doctors doc
  JOIN users u ON doc.user_id = u.id
  LEFT JOIN departments dep ON doc.department_id = dep.id
`;

// GET /api/doctors?department=&search= - public listing with filters
router.get('/', async (req, res) => {
  try {
    const { department, search } = req.query;
    let query = DOCTOR_SELECT + ' WHERE 1=1';
    const params = [];
    if (department) {
      query += ' AND dep.id = ?';
      params.push(department);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR dep.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY u.name';
    
    const [doctors] = await db.query(query, params);
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve doctors' });
  }
});

// GET /api/doctors/:id - doctor profile detail
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(DOCTOR_SELECT + ' WHERE doc.id = ?', [req.params.id]);
    const doctor = rows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve doctor profile' });
  }
});

// PUT /api/doctors/:id - doctor updates own profile, or admin
router.put('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    const doctor = rows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    if (req.user.role !== 'admin' && req.user.id !== doctor.user_id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    const { department_id, experience_years, consultation_fee, available_slots, bio, phone } = req.body;
    
    await db.query(`
      UPDATE doctors SET
        department_id = COALESCE(?, department_id),
        experience_years = COALESCE(?, experience_years),
        consultation_fee = COALESCE(?, consultation_fee),
        available_slots = COALESCE(?, available_slots),
        bio = COALESCE(?, bio)
      WHERE id = ?
    `, [
      department_id !== undefined && department_id !== '' ? department_id : null,
      experience_years !== undefined && experience_years !== '' ? experience_years : null,
      consultation_fee !== undefined && consultation_fee !== '' ? consultation_fee : null,
      available_slots !== undefined && available_slots !== '' ? (typeof available_slots === 'string' ? available_slots : JSON.stringify(available_slots)) : null,
      bio !== undefined && bio !== '' ? bio : null,
      req.params.id
    ]);

    if (phone && phone !== '') {
      await db.query('UPDATE users SET phone = ? WHERE id = ?', [phone, doctor.user_id]);
    }
    res.json({ message: 'Doctor profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
});

// DELETE /api/doctors/:id - admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    const doctor = rows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    
    await db.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM users WHERE id = ?', [doctor.user_id]);
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

// GET /api/doctors/:id/appointments - doctor's own appointment schedule
router.get('/:id/appointments', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    const doctor = rows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    if (req.user.role !== 'admin' && req.user.id !== doctor.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [appts] = await db.query(`
      SELECT a.*, u.name as patient_name, u.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date, a.appointment_time
    `, [req.params.id]);
    res.json(appts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

module.exports = router;
