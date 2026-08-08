// MySQL or SQLite Database Pool Layer depending on environment variables.
// If DB_HOST is provided, connects to MySQL. Otherwise, falls back to node:sqlite.

const mysql = require('mysql2/promise');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool;
let sqliteDb;
const isOnRender = process.env.RENDER === 'true';
const isSQLite = !process.env.DB_HOST || (isOnRender && (process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1'));

if (!isSQLite) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'healthcare.db');
  sqliteDb = new DatabaseSync(dbFile);
}

// Automatically initialize schema tables if they do not exist
async function initDb() {
  if (!isSQLite) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',
          phone VARCHAR(20),
          profile_picture VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS doctors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          department_id INT,
          experience_years INT DEFAULT 0,
          consultation_fee DECIMAL(10,2) DEFAULT 0,
          available_slots TEXT,
          bio TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS patients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          date_of_birth DATE,
          gender VARCHAR(20),
          address VARCHAR(255),
          medical_history TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_id INT NOT NULL,
          doctor_id INT NOT NULL,
          department_id INT,
          appointment_date DATE NOT NULL,
          appointment_time VARCHAR(20) NOT NULL,
          status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
          message TEXT,
          reminder_sent TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        )
      `);

      try {
        await connection.query(`ALTER TABLE appointments ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0`);
      } catch (e) { /* Column already exists */ }

      await connection.query(`
        CREATE TABLE IF NOT EXISTS enquiries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_name VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          department VARCHAR(100),
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(200),
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(150) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error('MySQL database initialization error:', err.message);
    } finally {
      if (connection) connection.release();
    }
  } else {
    try {
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'patient' CHECK(role IN ('patient','doctor','admin')),
          phone TEXT,
          profile_picture TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          department_id INTEGER,
          experience_years INTEGER DEFAULT 0,
          consultation_fee REAL DEFAULT 0,
          available_slots TEXT,
          bio TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          date_of_birth TEXT,
          gender TEXT,
          address TEXT,
          medical_history TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          doctor_id INTEGER NOT NULL,
          department_id INTEGER,
          appointment_date TEXT NOT NULL,
          appointment_time TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
          message TEXT,
          reminder_sent INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
          FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS enquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          department TEXT,
          message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT,
          message TEXT,
          is_read INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          used INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        sqliteDb.exec(`ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0;`);
      } catch (e) { /* Column already exists */ }

      // Automatically seed SQLite database if it has no users (e.g. on Render first start)
      const countResult = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();
      if (countResult.count === 0) {
        console.log('Seeding SQLite database automatically on Render...');
        const hashedAdmin = bcrypt.hashSync('Admin@123', 10);
        const hashedDoctor = bcrypt.hashSync('Doctor@123', 10);
        const hashedPatient = bcrypt.hashSync('Patient@123', 10);

        sqliteDb.exec(`
          INSERT INTO users (name, email, password, role, phone) VALUES 
            ('System Admin', 'admin@clinic.com', '${hashedAdmin}', 'admin', '9999999999'),
            ('Dr. Ananya Rao', 'ananya.rao@clinic.com', '${hashedDoctor}', 'doctor', '9876543210'),
            ('Dr. Rahul Mehta', 'rahul.mehta@clinic.com', '${hashedDoctor}', 'doctor', '9876543211'),
            ('Dr. Priya Nair', 'priya.nair@clinic.com', '${hashedDoctor}', 'doctor', '9876543212'),
            ('Dr. Karthik Iyer', 'karthik.iyer@clinic.com', '${hashedDoctor}', 'doctor', '9876543213'),
            ('Dr. Sneha Pillai', 'sneha.pillai@clinic.com', '${hashedDoctor}', 'doctor', '9876543214'),
            ('Demo Patient', 'patient@demo.com', '${hashedPatient}', 'patient', '9123456789');

          INSERT INTO departments (name, description) VALUES 
            ('Cardiology', 'Heart and cardiovascular care'),
            ('Dermatology', 'Skin, hair and nail treatment'),
            ('Pediatrics', 'Healthcare for infants, children and adolescents'),
            ('Orthopedics', 'Bones, joints, ligaments, tendons and muscles'),
            ('General Medicine', 'Primary care and general health checkups');

          INSERT INTO doctors (user_id, department_id, experience_years, consultation_fee, available_slots, bio) VALUES 
            (2, 1, 12, 800, '["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"]', 'Senior cardiologist with 12 years of clinical experience.'),
            (3, 2, 8, 600, '["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"]', 'Specialist in skin and cosmetic dermatology.'),
            (4, 3, 10, 500, '["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"]', 'Dedicated pediatrician focused on child wellness.'),
            (5, 4, 15, 900, '["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"]', 'Orthopedic surgeon specializing in joint replacement.'),
            (6, 5, 6, 400, '["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"]', 'General physician for everyday health concerns.');

          INSERT INTO patients (user_id, date_of_birth, gender, address) VALUES 
            (7, '1998-05-14', 'Male', 'Chennai, Tamil Nadu');
        `);
        console.log('SQLite database seeded successfully!');
      }
    } catch (err) {
      console.error('SQLite database initialization error:', err.message);
    }
  }
}

const db = {
  isSQLite,
  initDb,
  query: async (sql, params) => {
    if (!isSQLite) {
      return pool.query(sql, params);
    } else {
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      const stmt = sqliteDb.prepare(sql);
      if (isSelect) {
        const rows = stmt.all(...(params || []));
        return [rows, null];
      } else {
        const info = stmt.run(...(params || []));
        return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, null];
      }
    }
  },
  end: async () => {
    if (!isSQLite) {
      await pool.end();
    }
  }
};

const initPromise = initDb();
db.initPromise = initPromise;

module.exports = db;
