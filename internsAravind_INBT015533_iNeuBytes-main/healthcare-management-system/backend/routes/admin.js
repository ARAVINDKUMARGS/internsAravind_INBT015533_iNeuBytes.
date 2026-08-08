const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/stats - dashboard overview statistics
router.get('/stats', async (req, res) => {
  try {
    const queries = [
      db.query('SELECT COUNT(*) as c FROM doctors'),
      db.query('SELECT COUNT(*) as c FROM patients'),
      db.query('SELECT COUNT(*) as c FROM appointments'),
      db.query('SELECT COUNT(*) as c FROM departments'),
      db.query("SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as c FROM appointments WHERE status = 'confirmed'"),
      db.query("SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'"),
      db.query("SELECT COUNT(*) as c FROM appointments WHERE status = 'cancelled'"),
      db.query(`
        SELECT dep.name, COUNT(DISTINCT doc.id) as doctor_count, COUNT(a.id) as appointment_count
        FROM departments dep
        LEFT JOIN doctors doc ON doc.department_id = dep.id
        LEFT JOIN appointments a ON a.department_id = dep.id
        GROUP BY dep.id, dep.name
        ORDER BY appointment_count DESC
      `),
      db.query(`
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, pu.name as patient_name, du.name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id JOIN users pu ON p.user_id = pu.id
        JOIN doctors doc ON a.doctor_id = doc.id JOIN users du ON doc.user_id = du.id
        ORDER BY a.created_at DESC LIMIT 10
      `)
    ];

    const results = await Promise.all(queries);

    const totalDoctors = results[0][0][0].c;
    const totalPatients = results[1][0][0].c;
    const totalAppointments = results[2][0][0].c;
    const totalDepartments = results[3][0][0].c;
    const pending = results[4][0][0].c;
    const confirmed = results[5][0][0].c;
    const completed = results[6][0][0].c;
    const cancelled = results[7][0][0].c;
    const departmentStats = results[8][0];
    const recentAppointments = results[9][0];

    res.json({
      totals: { doctors: totalDoctors, patients: totalPatients, appointments: totalAppointments, departments: totalDepartments },
      appointmentsByStatus: { pending, confirmed, completed, cancelled },
      departmentStats,
      recentAppointments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve admin stats' });
  }
});

// GET /api/admin/reports/appointments - CSV-ready export data
router.get('/reports/appointments', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.status,
             pu.name as patient_name, pu.email as patient_email,
             du.name as doctor_name, dep.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id JOIN users pu ON p.user_id = pu.id
      JOIN doctors doc ON a.doctor_id = doc.id JOIN users du ON doc.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      ORDER BY a.appointment_date DESC
    `);

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const header = 'ID,Date,Time,Status,Patient,Patient Email,Doctor,Department\n';
      const body = rows.map(r =>
        [r.id, r.appointment_date, r.appointment_time, r.status, r.patient_name, r.patient_email, r.doctor_name, r.department_name]
          .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="appointments-report.csv"');
      return res.send(header + body);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate appointments report' });
  }
});

module.exports = router;
