// Seeds the database with an admin account, sample departments, doctors and a
// demo patient so the app can be explored immediately after setup.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function upsertUser(name, email, password, role, phone) {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  let user = rows[0];
  if (user) return user;
  const hashed = bcrypt.hashSync(password, 10);
  const [info] = await db.query(
    'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
    [name, email, hashed, role, phone || null]
  );
  const [userRows] = await db.query('SELECT * FROM users WHERE id = ?', [info.insertId]);
  return userRows[0];
}

(async () => {
  try {
    console.log('Seeding database...');
    await db.initPromise;

    // Admin
    const admin = await upsertUser('System Admin', 'admin@clinic.com', 'Admin@123', 'admin', '9999999999');
    console.log('Admin login: admin@clinic.com / Admin@123');

    // Departments
    const departments = [
      ['Cardiology', 'Heart and cardiovascular care'],
      ['Dermatology', 'Skin, hair and nail treatment'],
      ['Pediatrics', 'Healthcare for infants, children and adolescents'],
      ['Orthopedics', 'Bones, joints, ligaments, tendons and muscles'],
      ['General Medicine', 'Primary care and general health checkups'],
    ];
    const depIds = {};
    for (const [name, description] of departments) {
      const [rows] = await db.query('SELECT * FROM departments WHERE name = ?', [name]);
      let dep = rows[0];
      if (!dep) {
        const [info] = await db.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description]);
        dep = { id: info.insertId, name };
      }
      depIds[name] = dep.id;
    }
    console.log('Departments seeded:', Object.keys(depIds).join(', '));

    // Doctors
    const doctors = [
      ['Dr. Ananya Rao', 'ananya.rao@clinic.com', 'Doctor@123', '9876543210', 'Cardiology', 12, 800, 'Senior cardiologist with 12 years of clinical experience.'],
      ['Dr. Rahul Mehta', 'rahul.mehta@clinic.com', 'Doctor@123', '9876543211', 'Dermatology', 8, 600, 'Specialist in skin and cosmetic dermatology.'],
      ['Dr. Priya Nair', 'priya.nair@clinic.com', 'Doctor@123', '9876543212', 'Pediatrics', 10, 500, 'Dedicated pediatrician focused on child wellness.'],
      ['Dr. Karthik Iyer', 'karthik.iyer@clinic.com', 'Doctor@123', '9876543213', 'Orthopedics', 15, 900, 'Orthopedic surgeon specializing in joint replacement.'],
      ['Dr. Sneha Pillai', 'sneha.pillai@clinic.com', 'Doctor@123', '9876543214', 'General Medicine', 6, 400, 'General physician for everyday health concerns.'],
    ];
    const slots = JSON.stringify(['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']);
    for (const [name, email, password, phone, dept, exp, fee, bio] of doctors) {
      const user = await upsertUser(name, email, password, 'doctor', phone);
      const [existing] = await db.query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO doctors (user_id, department_id, experience_years, consultation_fee, available_slots, bio)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.id, depIds[dept], exp, fee, slots, bio]
        );
      }
    }
    console.log('Sample doctors seeded (password for all: Doctor@123)');

    // Demo patient
    const patientUser = await upsertUser('Demo Patient', 'patient@demo.com', 'Patient@123', 'patient', '9123456789');
    const [existingPatient] = await db.query('SELECT * FROM patients WHERE user_id = ?', [patientUser.id]);
    if (existingPatient.length === 0) {
      await db.query(
        'INSERT INTO patients (user_id, date_of_birth, gender, address) VALUES (?, ?, ?, ?)',
        [patientUser.id, '1998-05-14', 'Male', 'Chennai, Tamil Nadu']
      );
    }
    console.log('Demo patient login: patient@demo.com / Patient@123');

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    db.end();
  }
})();
