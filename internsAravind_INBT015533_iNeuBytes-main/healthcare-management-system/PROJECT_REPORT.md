# Project Development Report

**Project:** Healthcare / Clinic Management System (Major Project)
**Program:** iNeuBytes Virtual Internship Program (VIIP) — Web Development
**Course ID:** WBINB20726

## 1. System architecture

The system follows a classic three-tier architecture:

- **Presentation layer** — static HTML/CSS/JS pages served by Express. Each role
  (patient/doctor/admin) has a dedicated dashboard; a shared `js/api.js` module wraps
  `fetch` calls, attaches the JWT, and centralizes toast/error handling.
- **Application layer** — Express.js REST API organized by resource (`auth`, `doctors`,
  `patients`, `departments`, `appointments`, `admin`, `enquiries`). Middleware
  (`authenticate`, `authorize`) enforces authentication and role-based access control on
  every protected route.
- **Data layer** — relational schema (users → doctors/patients, departments, appointments,
  enquiries, notifications) implemented with `better-sqlite3` for local development, with a
  1:1 MySQL DDL reference (`database.sql`) for production use.

## 2. Database design

`users` is the identity table for all three roles. `doctors` and `patients` extend `users`
with role-specific fields via a 1:1 foreign key relationship. `appointments` links a patient
to a doctor and (denormalized) a department, with a status state machine:
`pending → confirmed → completed`, or `→ cancelled` at any point before completion. This
mirrors the Task 2 "Doctor Appointment Booking System" requirements (doctor search,
department filter, appointment booking, appointment history) and the Task 3 "Healthcare
Management Dashboard" requirements (CRUD operations, dynamic statistics).

## 3. Implementation methodology

Development followed the task sequence laid out in the internship brief:

1. **Task 1 — Landing page:** built the public-facing marketing/enquiry page first, since
   its structure (hero, services, doctor highlights) previews the data model needed later.
2. **Task 2 — Booking system:** implemented the doctor/appointment data model and booking
   flow, including slot-clash prevention on the backend.
3. **Task 3 — Management dashboard:** built the admin statistics endpoint and dashboard UI
   on top of the same data model, adding CRUD for doctors, patients, and departments.
4. **Major Project — Integration:** unified all three into one authenticated system with
   role-based dashboards, JWT auth, and a single Express server serving both the API and
   the static frontend.

## 4. Challenges encountered and solutions

- **Preventing double-booked time slots** — solved with a server-side uniqueness check on
  `(doctor_id, appointment_date, appointment_time)` before insert, returning a 409 Conflict
  with a clear message rather than relying on client-side validation alone.
- **Role-based access on shared resources** (e.g. a doctor should only see their own
  appointments, a patient only their own profile) — solved with ownership checks in each
  route handler that compare `req.user.id` against the resource's owning `user_id`.
- **Database portability** — the brief specifies MySQL, but a MySQL server isn't always
  available in a fresh dev environment. Solved by using `better-sqlite3` with an identical
  schema shape, documented in the README's "Switching to MySQL" section so the swap is a
  drop-in change to `config/db.js` rather than a schema rewrite.

## 5. Testing performed

- Full authentication flow verified: patient registration, admin/doctor/patient login, JWT
  issuance and validation, and role-based route rejection for out-of-role requests.
- Appointment lifecycle verified end-to-end: booking → admin/doctor visibility → status
  update (confirm/complete/cancel) → patient-side history reflects the new status.
- Admin CRUD verified for departments (create/edit/delete) and doctor account creation via
  `register-staff`.
- Dashboard statistics endpoint verified to aggregate correctly across totals, status
  breakdown, and per-department activity.
- All frontend pages verified to load correctly (200 responses) when served by the Express
  static file layer, including CSS/JS assets.
- Responsive layout checked against mobile/tablet/desktop breakpoints defined in `style.css`.

## 6. Future enhancements

- Email/SMS notifications for appointment confirmations and reminders (notification table
  is already in place; only a delivery integration is missing).
- Doctor-configurable available slots per day instead of a fixed weekly slot list.
- File upload support for profile pictures and medical documents.
- Pagination and server-side sorting for the admin doctor/patient/appointment tables as data
  volume grows.
- Automated test suite (Jest + Supertest) covering the API routes.

## 7. Final output checklist

- [x] Responsive Healthcare/Clinic Landing Page with enquiry form validation
- [x] Doctor Appointment Booking System with search, department filter, booking
- [x] Healthcare Management Dashboard with CRUD and dynamic statistics
- [x] Complete Healthcare/Clinic Management System integrating all of the above
- [x] Secure authentication, authorization, and role-based access control
- [x] Relational database schema (SQLite locally / MySQL-ready)
- [x] Project development report (this document)
- [x] README with setup instructions, project structure, and API documentation
