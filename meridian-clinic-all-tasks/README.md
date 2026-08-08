# Meridian Health Clinic — Web Development Internship Tasks
**iNeuBytes Virtual Internship Program (VIIP) · Course ID: WBINB20726**

This repository contains the completed micro-assessment tasks for the Web Development track, built around a consistent healthcare brand ("Meridian Health Clinic") across all three tasks.

> Replace this header with your submission format: `InternFirstName_RegdNo_iNeuBytes`

## Structure

```
Task1/   Healthcare / Clinic Landing Page
Task2/   Doctor Appointment Booking System
Task3/   Healthcare Management Dashboard
```

Each task folder is self-contained — open `index.html` directly in a browser, no build step or server required.

---

## Task 1 — Healthcare / Clinic Landing Page
`/Task1/index.html`

A responsive marketing landing page for the clinic: hero section, about, medical services, doctor highlights, testimonials, appointment enquiry form with client-side validation, and Google Maps integration.

**Tech:** HTML5, CSS3, vanilla JavaScript (single file).

## Task 2 — Doctor Appointment Booking System
`/Task2/index.html` + `styles.css` + `script.js`

A single-page app for browsing doctors, searching/filtering by department, viewing doctor profiles with live availability, and booking appointments with a confirmation summary. Appointment history is saved per-browser via `localStorage`.

**Tech:** HTML5, CSS3, vanilla JavaScript, localStorage.

## Task 3 — Healthcare Management Dashboard
`/Task3/index.html` + `styles.css` + `script.js`

An admin dashboard with sidebar navigation, dynamic statistics cards, and full CRUD (create/read/update/delete) for Doctors, Patients, Departments, and Appointments — including search, filtering, and appointment status updates. All data persists via `localStorage`, seeded with sample records on first load.

**Tech:** HTML5, CSS3, vanilla JavaScript, localStorage.

---

## How to run
1. Clone or download this repository.
2. Open any `Task{n}/index.html` file directly in a browser — each task works standalone.

## Notes
- No external backend or database is used; Tasks 2 and 3 use browser `localStorage` for data persistence, as permitted by the task brief.
- All styling is custom (no CSS frameworks), built around a shared design system (Fraunces/Manrope/IBM Plex Mono typography, pine-green and coral color palette).
