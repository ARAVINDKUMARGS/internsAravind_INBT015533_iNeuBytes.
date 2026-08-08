const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const PATIENT_SELECT = `
  SELECT p.id, p.date_of_birth, p.gender, p.address, p.medical_history,
         u.id as user_id, u.name, u.email, u.phone, u.profile_picture, u.created_at
  FROM patients p
  JOIN users u ON p.user_id = u.id
`;

// GET /api/patients - admin and doctor, with search
router.get('/', authenticate, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const { search } = req.query;
    let query = PATIENT_SELECT;
    const params = [];
    if (search) {
      query += ' WHERE u.name LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY u.name';
    
    const [patients] = await db.query(query, params);
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(PATIENT_SELECT + ' WHERE p.id = ?', [req.params.id]);
    const patient = rows[0];
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'patient' && req.user.id !== patient.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve patient profile' });
  }
});

// PUT /api/patients/:id - patient updates own profile, or admin
router.put('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    const patient = rows[0];
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role !== 'admin' && req.user.id !== patient.user_id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    const { date_of_birth, gender, address, medical_history, phone, name } = req.body;
    
    await db.query(`
      UPDATE patients SET
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        address = COALESCE(?, address),
        medical_history = COALESCE(?, medical_history)
      WHERE id = ?
    `, [
      date_of_birth !== undefined && date_of_birth !== '' ? date_of_birth : null,
      gender !== undefined && gender !== '' ? gender : null,
      address !== undefined && address !== '' ? address : null,
      medical_history !== undefined && medical_history !== '' ? medical_history : null,
      req.params.id
    ]);

    if (phone || name) {
      await db.query('UPDATE users SET phone = COALESCE(?, phone), name = COALESCE(?, name) WHERE id = ?', [
        phone !== undefined && phone !== '' ? phone : null,
        name !== undefined && name !== '' ? name : null,
        patient.user_id
      ]);
    }
    res.json({ message: 'Patient profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update patient profile' });
  }
});

// DELETE /api/patients/:id - admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    const patient = rows[0];
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    await db.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM users WHERE id = ?', [patient.user_id]);
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// GET /api/patients/:id/appointments - patient's own appointment history
router.get('/:id/appointments', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    const patient = rows[0];
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'patient' && req.user.id !== patient.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [appts] = await db.query(`
      SELECT a.*, u.name as doctor_name, dep.name as department_name
      FROM appointments a
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users u ON doc.user_id = u.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [req.params.id]);
    res.json(appts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

module.exports = router;
