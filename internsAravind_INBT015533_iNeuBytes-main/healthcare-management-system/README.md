# Healthcare & Clinic Management System

**iNeuBytes Virtual Internship Program (VIIP) — Web Development**
**Course ID: WBINB20726**

A complete Healthcare / Clinic Management System that lets patients book appointments,
doctors manage consultations, and administrators run the clinic from a central dashboard —
built to satisfy Task 1 (Clinic Landing Page), Task 2 (Doctor Appointment Booking System),
Task 3 (Healthcare Management Dashboard), and the **Major Project**.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom, no framework), vanilla JavaScript |
| Backend | Node.js + Express.js, RESTful API |
| Database | SQLite (`better-sqlite3`) for zero-config local development — schema is 1:1 compatible with the MySQL reference schema in `backend/database.sql` |
| Auth | JWT (JSON Web Tokens) + bcrypt password hashing, role-based access control |

> The task brief lists MySQL as the database. This build ships with SQLite so the app runs
> immediately with no external database server to install — the schema, queries, and app
> logic are written to be MySQL-compatible. See **"Switching to MySQL"** below to swap it in.

## Features implemented

- **Authentication & authorization** — patient self-registration, admin-created doctor/admin
  accounts, JWT login, role-based route protection (patient / doctor / admin).
- **Patient module** — profile management, browse doctors by department, book an
  appointment with live time-slot selection, appointment history with cancel/reschedule.
- **Doctor module** — profile management, today's schedule, full appointment list with
  filtering, confirm / complete / cancel consultations.
- **Admin module** — dashboard with live statistics (doctors, patients, appointments,
  departments), doctor CRUD (create/delete), patient CRUD (view/delete), department CRUD
  (create/edit/delete), appointment oversight, CSV report export.
- **Public landing page** — hero, about, services, doctor highlights, testimonials, an
  appointment enquiry form with client-side validation, embedded map, and footer.
- **Responsive design** — mobile / tablet / desktop breakpoints throughout.

## Project structure

```
healthcare-management-system/
├── backend/
│   ├── server.js            # Express app entry point
│   ├── config/db.js         # SQLite connection + schema
│   ├── database.sql         # MySQL reference schema
│   ├── middleware/auth.js   # JWT auth + role guard
│   ├── routes/               # auth, doctors, patients, departments, appointments, admin, enquiries
│   ├── seed.js               # Seeds admin, departments, sample doctors, demo patient
│   └── package.json
├── frontend/
│   ├── index.html            # Public landing page (Task 1)
│   ├── login.html / register.html
│   ├── patient-dashboard.html
│   ├── doctor-dashboard.html
│   ├── admin-dashboard.html  # Task 3 dashboard + Major Project admin console
│   ├── css/style.css
│   └── js/api.js             # Shared fetch wrapper, auth/session helpers
├── PROJECT_REPORT.md
└── README.md
```

## Setup & run locally

**Requirements:** Node.js 18+ and npm.

```bash
cd backend
npm install
cp .env.example .env      # already copied for you; edit JWT_SECRET for production
npm run seed               # creates admin, departments, sample doctors, demo patient
npm start                  # starts the server on http://localhost:5000
```

Then open **http://localhost:5000** in your browser — the backend also serves the frontend,
so no separate frontend server is needed.

### Demo logins (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinic.com | Admin@123 |
| Doctor | ananya.rao@clinic.com | Doctor@123 |
| Patient | patient@demo.com | Patient@123 |

## API overview

All endpoints are prefixed with `/api`. Protected endpoints require
`Authorization: Bearer <token>`.

- `POST /auth/register` — patient self-registration
- `POST /auth/register-staff` — admin creates doctor/admin accounts
- `POST /auth/login`, `GET /auth/me`, `PUT /auth/change-password`
- `GET /departments`, `POST/PUT/DELETE /departments/:id` (admin)
- `GET /doctors?department=&search=`, `GET /doctors/:id`, `PUT /doctors/:id`, `DELETE /doctors/:id` (admin)
- `GET /doctors/:id/appointments`
- `GET /patients` (admin/doctor), `GET/PUT/DELETE /patients/:id`
- `GET /patients/:id/appointments`
- `POST /appointments`, `GET /appointments` (admin), `PUT /appointments/:id/status`,
  `PUT /appointments/:id` (reschedule), `DELETE /appointments/:id` (cancel)
- `GET /admin/stats`, `GET /admin/reports/appointments?format=csv`
- `POST /enquiries` (public), `GET /enquiries` (admin)

## Switching to MySQL

The app currently uses `better-sqlite3` in `backend/config/db.js`. To use MySQL instead:

1. Run `backend/database.sql` against your MySQL server (e.g. MySQL Workbench or `mysql < database.sql`).
2. Install `mysql2`: `npm install mysql2`.
3. Replace `config/db.js` with a `mysql2/promise` connection pool, and change the
   `db.prepare(...).get()/.all()/.run()` calls in each route file to their `mysql2` async
   equivalents (`pool.query(...)`). The SQL statements themselves need no changes.

## Security notes

- Passwords are hashed with bcrypt (10 salt rounds) — never stored in plain text.
- JWTs expire after 7 days by default (`JWT_EXPIRES_IN` in `.env`).
- Role-based middleware (`authenticate`, `authorize`) protects every sensitive route.
- Before deploying publicly, replace `JWT_SECRET` in `.env` with a long random value and
  never commit `.env` to version control (see `.gitignore`).
# HOSPITAL-MANAGEMENT-SYSTEM 
