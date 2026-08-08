/* =====================================================
   DATA
===================================================== */
const DEPARTMENTS = ["General Medicine","Pediatrics","Cardiology","Dermatology","Orthopedics","Dental Care"];

const DOCTORS = [
  { id:1, name:"Dr. Rhea Sen", dept:"General Medicine", exp:12, fee:40, color:"#1B4B43", initials:"RS",
    bio:"Focuses on chronic condition management, preventive screening, and long-term primary care relationships." },
  { id:2, name:"Dr. Arjun Kapoor", dept:"Cardiology", exp:16, fee:70, color:"#E15B4F", initials:"AK",
    bio:"Specializes in preventive cardiology, ECG interpretation, and long-term heart health monitoring." },
  { id:3, name:"Dr. Nina Park", dept:"Pediatrics", exp:9, fee:35, color:"#6B7D77", initials:"NP",
    bio:"Known for a calm, kid-first approach to checkups, vaccinations, and growth monitoring." },
  { id:4, name:"Dr. Leo Martins", dept:"Dermatology", exp:8, fee:50, color:"#C74739", initials:"LM",
    bio:"Treats acne, eczema, and general skin concerns, with a focus on mole mapping and early detection." },
  { id:5, name:"Dr. Priya Nair", dept:"Orthopedics", exp:14, fee:60, color:"#1B4B43", initials:"PN",
    bio:"Handles joint pain, sports injuries, and coordinates physiotherapy referrals under one care plan." },
  { id:6, name:"Dr. Owen Blake", dept:"Dental Care", exp:11, fee:45, color:"#6B7D77", initials:"OB",
    bio:"Provides cleanings, fillings, and cosmetic consultations in Meridian's dedicated dental suite." },
  { id:7, name:"Dr. Farah Iqbal", dept:"General Medicine", exp:7, fee:38, color:"#E15B4F", initials:"FI",
    bio:"Sees patients for routine checkups and same-week concerns, with same-day referral coordination." },
  { id:8, name:"Dr. Sam Torres", dept:"Cardiology", exp:10, fee:65, color:"#123530", initials:"ST",
    bio:"Works with patients on stress testing, rhythm monitoring, and post-diagnosis lifestyle planning." },
];

const TIME_SLOTS = ["9:00 AM","10:30 AM","12:00 PM","1:30 PM","3:00 PM","4:30 PM"];

// Generate the next 5 upcoming dates, and deterministically "take" a couple of slots per doctor/day
function getUpcomingDates(n){
  const days = [];
  const today = new Date();
  for(let i=0; i<n; i++){
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}
const UPCOMING_DATES = getUpcomingDates(5);
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function isSlotTaken(doctorId, dateIndex, slotIndex){
  // deterministic pseudo-booked pattern so the UI feels real, but consistent across renders
  return (doctorId * 3 + dateIndex * 2 + slotIndex) % 5 === 0;
}

/* =====================================================
   STATE
===================================================== */
let state = {
  route: "home",
  searchTerm: "",
  activeDept: "",
  selectedDoctorId: null,
  selectedDateIndex: 0,
  selectedSlotIndex: null,
  lastBooking: null,
};

const STORAGE_KEY = "meridian_appointments";
function getAppointments(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch(e){ return []; }
}
function saveAppointments(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* =====================================================
   ROUTING
===================================================== */
function navigate(route){
  state.route = route;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + route).classList.add("active");
  document.querySelectorAll(".nav-links a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
  window.scrollTo({top:0, behavior:"smooth"});
  document.getElementById("navLinks").classList.remove("open");
  render();
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".route-link");
  if(link){
    e.preventDefault();
    navigate(link.dataset.route);
  }
});

/* =====================================================
   RENDER HELPERS
===================================================== */
function doctorAvatar(doc, size){
  return `<div class="avatar" style="background:${doc.color}; ${size ? `width:${size}px;height:${size}px;font-size:${size*0.32}px;`:''}">${doc.initials}</div>`;
}

function doctorCard(doc){
  return `
  <div class="doctor-card route-link" data-route="profile" onclick="openProfile(${doc.id})">
    <div class="doctor-top">
      ${doctorAvatar(doc)}
      <div><h3>${doc.name}</h3><div class="spec">${doc.dept}</div></div>
    </div>
    <div class="doctor-body">
      <p style="font-size:0.88rem; color:var(--sage); margin-bottom:14px;">${doc.exp} years experience</p>
      <div class="doctor-meta">
        <span class="tag">$${doc.fee} / visit</span>
        <span class="tag">${doc.dept}</span>
      </div>
      <a class="btn-text" onclick="event.stopPropagation(); openProfile(${doc.id})">View profile & book →</a>
    </div>
  </div>`;
}

function openProfile(id){
  state.selectedDoctorId = id;
  state.selectedDateIndex = 0;
  state.selectedSlotIndex = null;
  navigate("profile");
}

function chipsHtml(target){
  let html = `<button class="chip ${state.activeDept===''?'active':''}" onclick="setDept('', '${target}')">All</button>`;
  DEPARTMENTS.forEach(d => {
    html += `<button class="chip ${state.activeDept===d?'active':''}" onclick="setDept('${d}', '${target}')">${d}</button>`;
  });
  return html;
}
function setDept(dept, target){
  state.activeDept = dept;
  if(target === "list") navigate("doctors"); else render();
}

function filteredDoctors(){
  return DOCTORS.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesDept = !state.activeDept || d.dept === state.activeDept;
    return matchesSearch && matchesDept;
  });
}

/* =====================================================
   RENDER: HOME
===================================================== */
function renderHome(){
  document.getElementById("statDoctors").textContent = DOCTORS.length;
  const select = document.getElementById("homeDeptSelect");
  if(select.options.length <= 1){
    DEPARTMENTS.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d; opt.textContent = d;
      select.appendChild(opt);
    });
  }
  document.getElementById("homeChips").innerHTML = chipsHtml("home");
  document.getElementById("featuredGrid").innerHTML = DOCTORS.slice(0,3).map(doctorCard).join("");
}

document.getElementById("homeSearchBtn").addEventListener("click", () => {
  state.searchTerm = document.getElementById("homeSearchInput").value;
  state.activeDept = document.getElementById("homeDeptSelect").value;
});

/* =====================================================
   RENDER: DOCTOR LISTING
===================================================== */
function renderList(){
  document.getElementById("listSearchInput").value = state.searchTerm;
  document.getElementById("listChips").innerHTML = chipsHtml("list-inline");
  const results = filteredDoctors();
  document.getElementById("resultCount").textContent = `${results.length} doctor${results.length===1?'':'s'} found`;
  document.getElementById("listGrid").innerHTML = results.map(doctorCard).join("");
  document.getElementById("listGrid").style.display = results.length ? "grid" : "none";
  document.getElementById("emptyState").style.display = results.length ? "none" : "block";
}
document.getElementById("listSearchInput").addEventListener("input", (e) => {
  state.searchTerm = e.target.value;
  renderList();
});

/* =====================================================
   RENDER: DOCTOR PROFILE
===================================================== */
function renderProfile(){
  const doc = DOCTORS.find(d => d.id === state.selectedDoctorId);
  if(!doc){ document.getElementById("profileContent").innerHTML = "<p>Doctor not found.</p>"; return; }

  const dateTabs = UPCOMING_DATES.map((d, i) => `
    <button class="date-tab ${state.selectedDateIndex===i?'active':''}" onclick="selectDate(${i})">
      <div class="dow">${DOW[d.getDay()]}</div>
      <div class="dnum">${d.getDate()}</div>
    </button>`).join("");

  const timeSlots = TIME_SLOTS.map((t, i) => {
    const taken = isSlotTaken(doc.id, state.selectedDateIndex, i);
    const active = state.selectedSlotIndex === i;
    return `<button class="time-slot ${taken?'taken':''} ${active?'active':''}"
      ${taken ? 'disabled' : `onclick="selectSlot(${i})"`}>${t}</button>`;
  }).join("");

  const dateLabel = UPCOMING_DATES[state.selectedDateIndex].toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
  const canBook = state.selectedSlotIndex !== null;

  document.getElementById("profileContent").innerHTML = `
    <div class="profile-card">
      ${doctorAvatar(doc, 72)}
      <h2>${doc.name}</h2>
      <div class="spec">${doc.dept}</div>
      <div class="profile-fact"><span>Experience</span><span>${doc.exp} years</span></div>
      <div class="profile-fact"><span>Consultation fee</span><span>$${doc.fee}</span></div>
      <div class="profile-fact"><span>Department</span><span>${doc.dept}</span></div>
      <p class="bio">${doc.bio}</p>
    </div>
    <div class="slots-panel">
      <h3>Available time slots</h3>
      <p>Select a date, then a time slot to continue to booking.</p>
      <div class="date-tabs">${dateTabs}</div>
      <div class="time-grid">${timeSlots}</div>
      <div class="booking-cta">
        <button class="btn btn-primary" ${canBook?'':'disabled'} onclick="goToBooking()">Continue to booking</button>
        <span class="selection-note">${canBook ? dateLabel + " · " + TIME_SLOTS[state.selectedSlotIndex] : "No time slot selected yet"}</span>
      </div>
    </div>`;
}
function selectDate(i){ state.selectedDateIndex = i; state.selectedSlotIndex = null; render(); }
function selectSlot(i){ state.selectedSlotIndex = i; render(); }
function goToBooking(){ if(state.selectedSlotIndex !== null) navigate("book"); }

/* =====================================================
   RENDER: BOOKING FORM
===================================================== */
function renderBooking(){
  const doc = DOCTORS.find(d => d.id === state.selectedDoctorId);
  const dateLabel = UPCOMING_DATES[state.selectedDateIndex].toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
  const time = TIME_SLOTS[state.selectedSlotIndex];
  document.getElementById("bookingSummary").innerHTML = `
    <h3>Booking summary</h3>
    <div class="summary-row"><span>Doctor</span><span>${doc.name}</span></div>
    <div class="summary-row"><span>Department</span><span>${doc.dept}</span></div>
    <div class="summary-row"><span>Date</span><span>${dateLabel}</span></div>
    <div class="summary-row"><span>Time</span><span>${time}</span></div>
    <div class="summary-row total"><span>Consultation fee</span><span>$${doc.fee}</span></div>`;
}

const bookingValidators = {
  pName: v => v.trim().length >= 2 ? '' : 'Enter your full name (min 2 characters).',
  pEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.',
  pPhone: v => /^[0-9+()\-\s]{7,15}$/.test(v.trim()) ? '' : 'Enter a valid phone number.',
};
function validateBookingField(name){
  const field = document.getElementById(name);
  const errorEl = document.getElementById('err-' + name);
  const msg = bookingValidators[name](field.value);
  field.classList.toggle('invalid', !!msg);
  errorEl.textContent = msg;
  return !msg;
}
Object.keys(bookingValidators).forEach(name => {
  document.getElementById(name).addEventListener('blur', () => validateBookingField(name));
  document.getElementById(name).addEventListener('input', () => {
    if(document.getElementById(name).classList.contains('invalid')) validateBookingField(name);
  });
});

document.getElementById("bookingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  let allValid = true;
  Object.keys(bookingValidators).forEach(name => { if(!validateBookingField(name)) allValid = false; });
  if(!allValid) return;

  const doc = DOCTORS.find(d => d.id === state.selectedDoctorId);
  const dateObj = UPCOMING_DATES[state.selectedDateIndex];
  const appointment = {
    id: Date.now(),
    doctorName: doc.name,
    department: doc.dept,
    fee: doc.fee,
    date: dateObj.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'}),
    time: TIME_SLOTS[state.selectedSlotIndex],
    patientName: document.getElementById("pName").value.trim(),
    email: document.getElementById("pEmail").value.trim(),
    phone: document.getElementById("pPhone").value.trim(),
    notes: document.getElementById("pNotes").value.trim(),
    status: "Confirmed",
    bookedAt: new Date().toISOString(),
  };
  const list = getAppointments();
  list.unshift(appointment);
  saveAppointments(list);
  state.lastBooking = appointment;
  document.getElementById("bookingForm").reset();
  navigate("confirm");
});

/* =====================================================
   RENDER: CONFIRMATION
===================================================== */
function renderConfirm(){
  const b = state.lastBooking;
  if(!b){ document.getElementById("confirmCard").innerHTML = "<p>No recent booking found.</p>"; return; }
  document.getElementById("confirmCard").innerHTML = `
    <div class="summary-row"><span>Patient</span><span>${b.patientName}</span></div>
    <div class="summary-row"><span>Doctor</span><span>${b.doctorName}</span></div>
    <div class="summary-row"><span>Department</span><span>${b.department}</span></div>
    <div class="summary-row"><span>Date</span><span>${b.date}</span></div>
    <div class="summary-row"><span>Time</span><span>${b.time}</span></div>
    <div class="summary-row total"><span>Consultation fee</span><span>$${b.fee}</span></div>`;
}

/* =====================================================
   RENDER: HISTORY
===================================================== */
function renderHistory(){
  const list = getAppointments();
  document.getElementById("historyList").style.display = list.length ? "flex" : "none";
  document.getElementById("historyEmpty").style.display = list.length ? "none" : "block";
  document.getElementById("historyList").innerHTML = list.map(a => `
    <div class="history-item">
      <div class="history-left">
        <div class="avatar" style="background:var(--pine); width:44px; height:44px; font-size:0.9rem;">${a.doctorName.split(' ').slice(-1)[0][0]}${a.doctorName.split(' ')[0][1] || ''}</div>
        <div class="history-info">
          <h4>${a.doctorName} · ${a.department}</h4>
          <div class="meta">${a.date} · ${a.time} · Patient: ${a.patientName}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:16px;">
        <span class="status-pill">${a.status}</span>
        <a class="cancel-link" onclick="cancelAppointment(${a.id})">Cancel</a>
      </div>
    </div>`).join("");
}
function cancelAppointment(id){
  const list = getAppointments().filter(a => a.id !== id);
  saveAppointments(list);
  renderHistory();
}

/* =====================================================
   MASTER RENDER
===================================================== */
function render(){
  if(state.route === "home") renderHome();
  if(state.route === "doctors") renderList();
  if(state.route === "profile") renderProfile();
  if(state.route === "book") renderBooking();
  if(state.route === "confirm") renderConfirm();
  if(state.route === "history") renderHistory();
}

/* ---- Mobile nav ---- */
document.getElementById("burger").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});
document.querySelectorAll(".nav-close").forEach(l => l.addEventListener("click", () => document.getElementById("navLinks").classList.remove("open")));

navigate("home");
