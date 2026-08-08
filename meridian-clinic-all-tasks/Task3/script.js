/* =====================================================
   STORAGE KEYS + SEED DATA
===================================================== */
const KEYS = {
  doctors: "meridian_admin_doctors",
  patients: "meridian_admin_patients",
  departments: "meridian_admin_departments",
  appointments: "meridian_admin_appointments",
};

function seedIfEmpty(){
  if(!localStorage.getItem(KEYS.departments)){
    save("departments", [
      {id:1, name:"General Medicine", head:"Dr. Rhea Sen", description:"Routine checkups and chronic condition management."},
      {id:2, name:"Pediatrics", head:"Dr. Nina Park", description:"Child healthcare, growth checks and vaccinations."},
      {id:3, name:"Cardiology", head:"Dr. Arjun Kapoor", description:"Heart health, ECGs and long-term monitoring."},
      {id:4, name:"Dermatology", head:"Dr. Leo Martins", description:"Skin checks, acne and eczema treatment."},
      {id:5, name:"Orthopedics", head:"Dr. Priya Nair", description:"Joint pain, sports injuries and physiotherapy referrals."},
      {id:6, name:"Dental Care", head:"Dr. Owen Blake", description:"Cleanings, fillings and cosmetic consultations."},
    ]);
  }
  if(!localStorage.getItem(KEYS.doctors)){
    save("doctors", [
      {id:1, name:"Dr. Rhea Sen", department:"General Medicine", experience:12, fee:40, phone:"555-019-2201", email:"rhea.sen@meridian.example"},
      {id:2, name:"Dr. Arjun Kapoor", department:"Cardiology", experience:16, fee:70, phone:"555-019-2202", email:"arjun.kapoor@meridian.example"},
      {id:3, name:"Dr. Nina Park", department:"Pediatrics", experience:9, fee:35, phone:"555-019-2203", email:"nina.park@meridian.example"},
      {id:4, name:"Dr. Leo Martins", department:"Dermatology", experience:8, fee:50, phone:"555-019-2204", email:"leo.martins@meridian.example"},
      {id:5, name:"Dr. Priya Nair", department:"Orthopedics", experience:14, fee:60, phone:"555-019-2205", email:"priya.nair@meridian.example"},
      {id:6, name:"Dr. Owen Blake", department:"Dental Care", experience:11, fee:45, phone:"555-019-2206", email:"owen.blake@meridian.example"},
    ]);
  }
  if(!localStorage.getItem(KEYS.patients)){
    save("patients", [
      {id:1, name:"Jordan Miller", age:34, gender:"Male", phone:"555-201-3344", email:"jordan.m@example.com", address:"12 Elm Street, Springfield"},
      {id:2, name:"Sara Lopez", age:29, gender:"Female", phone:"555-201-3345", email:"sara.l@example.com", address:"88 Maple Ave, Springfield"},
      {id:3, name:"Devon Turner", age:41, gender:"Male", phone:"555-201-3346", email:"devon.t@example.com", address:"4 Willowmere Ave, Springfield"},
    ]);
  }
  if(!localStorage.getItem(KEYS.appointments)){
    save("appointments", [
      {id:1, patientName:"Jordan Miller", doctorName:"Dr. Arjun Kapoor", department:"Cardiology", date:"2026-07-28", time:"10:30 AM", status:"Confirmed"},
      {id:2, patientName:"Sara Lopez", doctorName:"Dr. Nina Park", department:"Pediatrics", date:"2026-07-26", time:"9:00 AM", status:"Pending"},
      {id:3, patientName:"Devon Turner", doctorName:"Dr. Rhea Sen", department:"General Medicine", date:"2026-07-25", time:"3:00 PM", status:"Completed"},
    ]);
  }
}
function load(key){ try{ return JSON.parse(localStorage.getItem(KEYS[key])) || []; } catch(e){ return []; } }
function save(key, data){ localStorage.setItem(KEYS[key], JSON.stringify(data)); }
function nextId(list){ return list.length ? Math.max(...list.map(x=>x.id)) + 1 : 1; }

seedIfEmpty();

/* =====================================================
   STATE + ROUTING
===================================================== */
let state = { route:"dashboard", search:{doctors:"",patients:"",departments:"",appointments:""}, deptFilter:"", statusFilter:"" };
let modalCtx = { type:null, editId:null };
let confirmCtx = { type:null, id:null };

const TITLES = {
  dashboard:["Dashboard","Overview of clinic operations"],
  doctors:["Doctors","Manage doctor profiles and specialties"],
  patients:["Patients","Manage patient records"],
  departments:["Departments","Manage clinic departments"],
  appointments:["Appointments","Track and update appointment status"],
};

function navigate(route){
  state.route = route;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+route).classList.add("active");
  document.querySelectorAll(".sidebar-link").forEach(a=>a.classList.toggle("active", a.dataset.route===route));
  document.getElementById("pageTitle").textContent = TITLES[route][0];
  document.getElementById("pageSub").textContent = TITLES[route][1];
  closeSidebarMobile();
  renderAll();
}
document.addEventListener("click", e=>{
  const link = e.target.closest(".route-link");
  if(link){ e.preventDefault(); navigate(link.dataset.route); }
});

/* mobile sidebar */
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("backdrop");
document.getElementById("menuToggle").addEventListener("click", ()=>{ sidebar.classList.add("open"); backdrop.classList.add("show"); });
document.getElementById("sidebarClose").addEventListener("click", closeSidebarMobile);
backdrop.addEventListener("click", closeSidebarMobile);
function closeSidebarMobile(){ sidebar.classList.remove("open"); backdrop.classList.remove("show"); }

/* =====================================================
   TOAST
===================================================== */
let toastTimer;
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("show"), 2400);
}

/* =====================================================
   RENDER: DASHBOARD
===================================================== */
function renderDashboard(){
  const doctors = load("doctors"), patients = load("patients"), departments = load("departments"), appointments = load("appointments");
  document.getElementById("statDoctors").textContent = doctors.length;
  document.getElementById("statPatients").textContent = patients.length;
  document.getElementById("statAppointments").textContent = appointments.length;
  document.getElementById("statDepartments").textContent = departments.length;
  const pending = appointments.filter(a=>a.status==="Pending").length;
  document.getElementById("statApptDelta").textContent = pending ? `${pending} pending` : "All up to date";

  const maxCount = Math.max(1, ...departments.map(d => doctors.filter(doc=>doc.department===d.name).length));
  document.getElementById("deptBars").innerHTML = departments.map(d=>{
    const count = doctors.filter(doc=>doc.department===d.name).length;
    const pct = Math.round((count/maxCount)*100);
    return `<div class="dept-bar-row">
      <div class="dept-bar-label"><span>${d.name}</span><span>${count} doctor${count===1?'':'s'}</span></div>
      <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("") || "<p style='color:var(--sage); font-size:0.85rem;'>No departments yet.</p>";

  const recent = [...appointments].slice(-5).reverse();
  document.getElementById("recentAppts").innerHTML = recent.map(a=>`
    <div class="mini-appt">
      <div><div class="who">${a.patientName}</div><div class="when">${a.doctorName} · ${a.department}</div></div>
      <div class="when">${a.date} · ${a.time}</div>
    </div>`).join("") || "<p style='color:var(--sage); font-size:0.85rem;'>No appointments yet.</p>";
}

/* =====================================================
   RENDER: DOCTORS
===================================================== */
function renderDoctors(){
  const departments = load("departments");
  const filterSelect = document.getElementById("doctorDeptFilter");
  if(filterSelect.options.length <= 1){
    departments.forEach(d=>{
      const opt = document.createElement("option"); opt.value = d.name; opt.textContent = d.name;
      filterSelect.appendChild(opt);
    });
  }
  let doctors = load("doctors").filter(d =>
    d.name.toLowerCase().includes(state.search.doctors.toLowerCase()) &&
    (!state.deptFilter || d.department === state.deptFilter)
  );
  const body = document.getElementById("doctorsTableBody");
  body.innerHTML = doctors.length ? doctors.map(d=>`
    <tr>
      <td class="name-cell">${d.name}</td>
      <td><span class="badge">${d.department}</span></td>
      <td>${d.experience} yrs</td>
      <td>$${d.fee}</td>
      <td>${d.phone}</td>
      <td>${d.email}</td>
      <td class="actions">
        <button class="btn-icon" onclick="openModal('doctor', ${d.id})" title="Edit">${ICON_EDIT}</button>
        <button class="btn-icon danger" onclick="openConfirmModal('doctor', ${d.id})" title="Delete">${ICON_DELETE}</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="7">No doctors found.</td></tr>`;
}
document.getElementById("doctorSearch").addEventListener("input", e=>{ state.search.doctors = e.target.value; renderDoctors(); });
document.getElementById("doctorDeptFilter").addEventListener("change", e=>{ state.deptFilter = e.target.value; renderDoctors(); });

/* =====================================================
   RENDER: PATIENTS
===================================================== */
function renderPatients(){
  let patients = load("patients").filter(p => p.name.toLowerCase().includes(state.search.patients.toLowerCase()));
  const body = document.getElementById("patientsTableBody");
  body.innerHTML = patients.length ? patients.map(p=>`
    <tr>
      <td class="name-cell">${p.name}</td>
      <td>${p.age}</td>
      <td>${p.gender}</td>
      <td>${p.phone}</td>
      <td>${p.email}</td>
      <td>${p.address}</td>
      <td class="actions">
        <button class="btn-icon" onclick="openModal('patient', ${p.id})" title="Edit">${ICON_EDIT}</button>
        <button class="btn-icon danger" onclick="openConfirmModal('patient', ${p.id})" title="Delete">${ICON_DELETE}</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="7">No patients found.</td></tr>`;
}
document.getElementById("patientSearch").addEventListener("input", e=>{ state.search.patients = e.target.value; renderPatients(); });

/* =====================================================
   RENDER: DEPARTMENTS
===================================================== */
function renderDepartments(){
  const doctors = load("doctors");
  let departments = load("departments").filter(d => d.name.toLowerCase().includes(state.search.departments.toLowerCase()));
  const body = document.getElementById("departmentsTableBody");
  body.innerHTML = departments.length ? departments.map(d=>{
    const count = doctors.filter(doc=>doc.department===d.name).length;
    return `<tr>
      <td class="name-cell">${d.name}</td>
      <td>${d.head}</td>
      <td><span class="badge">${count}</span></td>
      <td>${d.description}</td>
      <td class="actions">
        <button class="btn-icon" onclick="openModal('department', ${d.id})" title="Edit">${ICON_EDIT}</button>
        <button class="btn-icon danger" onclick="openConfirmModal('department', ${d.id})" title="Delete">${ICON_DELETE}</button>
      </td>
    </tr>`;
  }).join("") : `<tr class="empty-row"><td colspan="5">No departments found.</td></tr>`;
}
document.getElementById("deptSearch").addEventListener("input", e=>{ state.search.departments = e.target.value; renderDepartments(); });

/* =====================================================
   RENDER: APPOINTMENTS
===================================================== */
function renderAppointments(){
  let appts = load("appointments").filter(a =>
    (a.patientName.toLowerCase().includes(state.search.appointments.toLowerCase()) ||
     a.doctorName.toLowerCase().includes(state.search.appointments.toLowerCase())) &&
    (!state.statusFilter || a.status === state.statusFilter)
  );
  const body = document.getElementById("appointmentsTableBody");
  body.innerHTML = appts.length ? appts.map(a=>`
    <tr>
      <td class="name-cell">${a.patientName}</td>
      <td>${a.doctorName}</td>
      <td><span class="badge">${a.department}</span></td>
      <td>${a.date}</td>
      <td>${a.time}</td>
      <td>
        <select class="status-select status-${a.status.toLowerCase()}" onchange="updateApptStatus(${a.id}, this.value, this)">
          <option ${a.status==="Pending"?"selected":""}>Pending</option>
          <option ${a.status==="Confirmed"?"selected":""}>Confirmed</option>
          <option ${a.status==="Completed"?"selected":""}>Completed</option>
          <option ${a.status==="Cancelled"?"selected":""}>Cancelled</option>
        </select>
      </td>
      <td class="actions">
        <button class="btn-icon danger" onclick="openConfirmModal('appointment', ${a.id})" title="Delete">${ICON_DELETE}</button>
      </td>
    </tr>`).join("") : `<tr class="empty-row"><td colspan="7">No appointments found.</td></tr>`;
}
document.getElementById("apptSearch").addEventListener("input", e=>{ state.search.appointments = e.target.value; renderAppointments(); });
document.getElementById("apptStatusFilter").addEventListener("change", e=>{ state.statusFilter = e.target.value; renderAppointments(); });

function updateApptStatus(id, newStatus, selectEl){
  let list = load("appointments");
  list = list.map(a => a.id===id ? {...a, status:newStatus} : a);
  save("appointments", list);
  selectEl.className = "status-select status-" + newStatus.toLowerCase();
  toast("Appointment status updated");
  renderDashboard();
}

/* =====================================================
   ICONS
===================================================== */
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13"/></svg>`;

/* =====================================================
   MODAL: FORM CONFIG
===================================================== */
const FORM_CONFIG = {
  doctor: {
    title: id => id ? "Edit Doctor" : "Add Doctor",
    fields: [
      {name:"name", label:"Full name", type:"text", full:true, validate:v=>v.trim().length>=2?'':'Enter a valid name.'},
      {name:"department", label:"Department", type:"select", options:()=>load("departments").map(d=>d.name), full:true, validate:v=>v?'':'Select a department.'},
      {name:"experience", label:"Experience (years)", type:"number", validate:v=>v!=="" && +v>=0 ?'':'Enter valid years.'},
      {name:"fee", label:"Consultation fee ($)", type:"number", validate:v=>v!=="" && +v>=0 ?'':'Enter a valid fee.'},
      {name:"phone", label:"Phone", type:"tel", validate:v=>/^[0-9+()\-\s]{7,15}$/.test(v.trim())?'':'Enter a valid phone number.'},
      {name:"email", label:"Email", type:"email", validate:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?'':'Enter a valid email.'},
    ]
  },
  patient: {
    title: id => id ? "Edit Patient" : "Add Patient",
    fields: [
      {name:"name", label:"Full name", type:"text", full:true, validate:v=>v.trim().length>=2?'':'Enter a valid name.'},
      {name:"age", label:"Age", type:"number", validate:v=>v!=="" && +v>0 && +v<130 ?'':'Enter a valid age.'},
      {name:"gender", label:"Gender", type:"select", options:()=>["Male","Female","Other"], validate:v=>v?'':'Select gender.'},
      {name:"phone", label:"Phone", type:"tel", validate:v=>/^[0-9+()\-\s]{7,15}$/.test(v.trim())?'':'Enter a valid phone number.'},
      {name:"email", label:"Email", type:"email", validate:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?'':'Enter a valid email.'},
      {name:"address", label:"Address", type:"text", full:true, validate:v=>v.trim().length>=4?'':'Enter a valid address.'},
    ]
  },
  department: {
    title: id => id ? "Edit Department" : "Add Department",
    fields: [
      {name:"name", label:"Department name", type:"text", full:true, validate:v=>v.trim().length>=2?'':'Enter a valid name.'},
      {name:"head", label:"Head doctor", type:"text", full:true, validate:v=>v.trim().length>=2?'':'Enter a valid name.'},
      {name:"description", label:"Description", type:"textarea", full:true, validate:v=>v.trim().length>=5?'':'Enter a short description.'},
    ]
  },
  appointment: {
    title: id => id ? "Edit Appointment" : "Add Appointment",
    fields: [
      {name:"patientName", label:"Patient", type:"select", options:()=>load("patients").map(p=>p.name), full:true, validate:v=>v?'':'Select a patient.'},
      {name:"doctorName", label:"Doctor", type:"select", options:()=>load("doctors").map(d=>d.name), full:true, validate:v=>v?'':'Select a doctor.'},
      {name:"date", label:"Date", type:"date", validate:v=>v?'':'Select a date.'},
      {name:"time", label:"Time", type:"text", validate:v=>v.trim().length>=3?'':'Enter a valid time.'},
      {name:"status", label:"Status", type:"select", options:()=>["Pending","Confirmed","Completed","Cancelled"], full:true, validate:v=>v?'':'Select a status.'},
    ]
  }
};
const TYPE_TO_KEY = {doctor:"doctors", patient:"patients", department:"departments", appointment:"appointments"};

/* =====================================================
   MODAL: OPEN / RENDER FORM
===================================================== */
function openModal(type, id=null){
  modalCtx = {type, editId:id};
  const config = FORM_CONFIG[type];
  document.getElementById("modalTitle").textContent = config.title(id);
  const record = id ? load(TYPE_TO_KEY[type]).find(r=>r.id===id) : null;

  document.getElementById("formFields").innerHTML = config.fields.map(f=>{
    const val = record ? record[f.name] : "";
    let control;
    if(f.type === "select"){
      const opts = f.options();
      control = `<select id="f_${f.name}">
        <option value="">Select...</option>
        ${opts.map(o=>`<option value="${o}" ${o===val?"selected":""}>${o}</option>`).join("")}
      </select>`;
    } else if(f.type === "textarea"){
      control = `<textarea id="f_${f.name}" rows="3">${val||""}</textarea>`;
    } else {
      control = `<input type="${f.type}" id="f_${f.name}" value="${val!==undefined && val!==null ? val : ''}">`;
    }
    return `<div class="field ${f.full?'full':''}">
      <label for="f_${f.name}">${f.label}</label>
      ${control}
      <span class="error-msg" id="err_${f.name}"></span>
    </div>`;
  }).join("");

  document.getElementById("formModalOverlay").classList.add("open");
}
function closeModal(){ document.getElementById("formModalOverlay").classList.remove("open"); }

document.getElementById("entityForm").addEventListener("submit", function(e){
  e.preventDefault();
  const config = FORM_CONFIG[modalCtx.type];
  let valid = true;
  const record = {};
  config.fields.forEach(f=>{
    const el = document.getElementById("f_"+f.name);
    const errEl = document.getElementById("err_"+f.name);
    const val = el.value;
    const msg = f.validate(val);
    el.classList.toggle("invalid", !!msg);
    errEl.textContent = msg;
    if(msg) valid = false;
    record[f.name] = f.type === "number" ? Number(val) : val;
  });
  if(!valid) return;

  const key = TYPE_TO_KEY[modalCtx.type];
  let list = load(key);
  if(modalCtx.editId){
    list = list.map(r => r.id === modalCtx.editId ? {...r, ...record} : r);
    toast(config.title(modalCtx.editId).replace("Edit","") + " updated");
  } else {
    record.id = nextId(list);
    list.push(record);
    toast(config.title(null).replace("Add","") + " added");
  }
  save(key, list);
  closeModal();
  renderAll();
});

/* =====================================================
   CONFIRM DELETE MODAL
===================================================== */
function openConfirmModal(type, id){
  confirmCtx = {type, id};
  document.getElementById("confirmModalOverlay").classList.add("open");
}
function closeConfirmModal(){ document.getElementById("confirmModalOverlay").classList.remove("open"); }
document.getElementById("confirmDeleteBtn").addEventListener("click", ()=>{
  const key = TYPE_TO_KEY[confirmCtx.type];
  let list = load(key).filter(r => r.id !== confirmCtx.id);
  save(key, list);
  closeConfirmModal();
  toast("Record deleted");
  renderAll();
});

/* =====================================================
   MASTER RENDER
===================================================== */
function renderAll(){
  renderDashboard();
  renderDoctors();
  renderPatients();
  renderDepartments();
  renderAppointments();
}

navigate("dashboard");
