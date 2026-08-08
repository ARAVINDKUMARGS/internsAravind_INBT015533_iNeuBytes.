const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper to fetch populated appointment details for emails
async function getFullAppointmentDetails(appointmentId) {
  const [rows] = await db.query(`
    SELECT a.*, 
           pu.name as patient_name, pu.email as patient_email, pu.phone as patient_phone,
           du.name as doctor_name, du.email as doctor_email, du.phone as doctor_phone,
           dep.name as department_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users pu ON p.user_id = pu.id
    JOIN doctors doc ON a.doctor_id = doc.id
    JOIN users du ON doc.user_id = du.id
    LEFT JOIN departments dep ON a.department_id = dep.id
    WHERE a.id = ?
  `, [appointmentId]);
  return rows[0] || null;
}

// POST /api/appointments - patient books an appointment
router.post('/', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { doctor_id, appointment_date, appointment_time, message } = req.body;
    if (!doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'doctor_id, appointment_date and appointment_time are required' });
    }
    const [patientRows] = await db.query('SELECT * FROM patients WHERE user_id = ?', [req.user.id]);
    const patient = patientRows[0];
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

    const [doctorRows] = await db.query('SELECT * FROM doctors WHERE id = ?', [doctor_id]);
    const doctor = doctorRows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // prevent double-booking the same doctor/date/time slot
    const [clashRows] = await db.query(
      `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (clashRows.length > 0) return res.status(409).json({ error: 'This time slot is already booked. Please choose another.' });

    const [info] = await db.query(`
      INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [patient.id, doctor_id, doctor.department_id, appointment_date, appointment_time, message || null]);

    await db.query(`INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
      [doctor.user_id, 'New Appointment Request', `New appointment requested for ${appointment_date} at ${appointment_time}`]);

    // Send emails asynchronously (Patient Confirmation & Doctor Notification)
    getFullAppointmentDetails(info.insertId).then(fullAppt => {
      if (fullAppt) {
        emailService.sendAppointmentConfirmationEmail(
          { name: fullAppt.patient_name, email: fullAppt.patient_email },
          fullAppt
        ).catch(e => console.error(e));

        emailService.sendDoctorAppointmentNotification(
          { name: fullAppt.doctor_name, email: fullAppt.doctor_email },
          fullAppt
        ).catch(e => console.error(e));
      }
    }).catch(e => console.error(e));

    res.status(201).json({ id: info.insertId, message: 'Appointment requested successfully', status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to request appointment' });
  }
});

// GET /api/appointments - admin sees all, with optional status filter
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, pu.name as patient_name, du.name as doctor_name, dep.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN users du ON doc.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
    `;
    const params = [];
    if (status) {
      query += ' WHERE a.status = ?';
      params.push(status);
    }
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';
    
    const [appts] = await db.query(query, params);
    res.json(appts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// GET /api/appointments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.user_id as patient_user_id, doc.user_id as doctor_user_id
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors doc ON a.doctor_id = doc.id
      WHERE a.id = ?
    `, [req.params.id]);
    const appt = rows[0];
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    
    const isOwner = req.user.id === appt.patient_user_id || req.user.id === appt.doctor_user_id;
    if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ error: 'Access denied' });
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve appointment details' });
  }
});

// PUT /api/appointments/:id/status - doctor or admin updates status
router.put('/:id/status', authenticate, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of ${valid.join(', ')}` });

    const [rows] = await db.query(`
      SELECT a.*, doc.user_id as doctor_user_id, p.user_id as patient_user_id
      FROM appointments a
      JOIN doctors doc ON a.doctor_id = doc.id
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `, [req.params.id]);
    const appt = rows[0];
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    
    if (req.user.role === 'doctor' && req.user.id !== appt.doctor_user_id) {
      return res.status(403).json({ error: 'You can only update your own appointments' });
    }

    await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    await db.query(`INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
      [appt.patient_user_id, 'Appointment Update', `Your appointment on ${appt.appointment_date} is now ${status}.`]);

    // If status is updated to cancelled or confirmed, trigger email notifications
    getFullAppointmentDetails(req.params.id).then(fullAppt => {
      if (fullAppt) {
        if (status === 'cancelled') {
          emailService.sendAppointmentCancellationEmail(
            { name: fullAppt.patient_name, email: fullAppt.patient_email },
            fullAppt,
            'Cancelled by clinic staff'
          ).catch(e => console.error(e));

          emailService.sendAppointmentCancellationEmail(
            { name: fullAppt.doctor_name, email: fullAppt.doctor_email },
            fullAppt,
            'Cancelled by clinic staff'
          ).catch(e => console.error(e));
        } else if (status === 'confirmed') {
          emailService.sendAppointmentConfirmationEmail(
            { name: fullAppt.patient_name, email: fullAppt.patient_email },
            fullAppt
          ).catch(e => console.error(e));
        }
      }
    }).catch(e => console.error(e));

    res.json({ message: 'Appointment status updated', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// PUT /api/appointments/:id - reschedule (patient, own appointment, only while pending)
router.put('/:id', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { appointment_date, appointment_time } = req.body;
    const [patientRows] = await db.query('SELECT * FROM patients WHERE user_id = ?', [req.user.id]);
    const patient = patientRows[0];
    
    const [apptRows] = await db.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    const appt = apptRows[0];
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.patient_id !== patient.id) return res.status(403).json({ error: 'Access denied' });
    if (appt.status === 'completed' || appt.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot reschedule a ${appt.status} appointment` });
    }
    
    await db.query('UPDATE appointments SET appointment_date = COALESCE(?, appointment_date), appointment_time = COALESCE(?, appointment_time), status = ? WHERE id = ?',
      [appointment_date !== undefined ? appointment_date : null, appointment_time !== undefined ? appointment_time : null, 'pending', req.params.id]);

    // Send updated confirmation email
    getFullAppointmentDetails(req.params.id).then(fullAppt => {
      if (fullAppt) {
        emailService.sendAppointmentConfirmationEmail(
          { name: fullAppt.patient_name, email: fullAppt.patient_email },
          fullAppt
        ).catch(e => console.error(e));
      }
    }).catch(e => console.error(e));

    res.json({ message: 'Appointment rescheduled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// DELETE /api/appointments/:id - patient cancels own appointment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [apptRows] = await db.query(`
      SELECT a.*, p.user_id as patient_user_id FROM appointments a
      JOIN patients p ON a.patient_id = p.id WHERE a.id = ?
    `, [req.params.id]);
    const appt = apptRows[0];
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (req.user.role === 'patient' && req.user.id !== appt.patient_user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.query(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [req.params.id]);

    // Send cancellation emails asynchronously
    getFullAppointmentDetails(req.params.id).then(fullAppt => {
      if (fullAppt) {
        emailService.sendAppointmentCancellationEmail(
          { name: fullAppt.patient_name, email: fullAppt.patient_email },
          fullAppt,
          'Cancelled by patient'
        ).catch(e => console.error(e));

        emailService.sendAppointmentCancellationEmail(
          { name: fullAppt.doctor_name, email: fullAppt.doctor_email },
          fullAppt,
          'Cancelled by patient'
        ).catch(e => console.error(e));
      }
    }).catch(e => console.error(e));

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

module.exports = router;

