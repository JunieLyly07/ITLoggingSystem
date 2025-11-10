/* ------------------- CORE LOGIC ------------------- */
const form = document.getElementById('requestForm');
const logBody = document.getElementById('logTable').querySelector('tbody');

let logs = [];

/* UI elements for widgets */
const totalCountEl = document.getElementById('totalCount');
const pendingCountEl = document.getElementById('pendingCount');
const inProgressCountEl = document.getElementById('inProgressCount');
const completedCountEl = document.getElementById('completedCount');
const completionCircle = document.getElementById('completionCircle');
const completionPercentEl = document.getElementById('completionPercent');
const timelineList = document.getElementById('timelineList');
const liveMonitor = document.getElementById('liveMonitor');

/* ------------------- FETCH FROM FIRESTORE ------------------- */
function fetchLogsFromFirebase() {
  db.collection('itLogs').orderBy('date', 'asc').get()
    .then(snapshot => {
      logs = [];
      snapshot.forEach(doc => logs.push({...doc.data(), id: doc.id}));
      renderTable();
    });
}

/* Render table; if newIndex >=0 then animate only the new row */
function renderTable(newIndex = -1) {
  logBody.innerHTML = '';
  logs.forEach((log, index) => {
    const row = document.createElement('tr');
    if(index === newIndex) {
      row.classList.add('new-row');
      row.addEventListener('animationend', ()=> row.classList.remove('new-row'));
    }

    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = `
      <option value="Pending">Pending</option>
      <option value="In Progress">In Progress</option>
      <option value="Completed">Completed</option>
    `;
    statusSelect.value = log.status || 'Pending';
    statusSelect.style.borderRadius = '20px';
    statusSelect.style.fontWeight = 'bold';
    statusSelect.style.padding = '5px 10px';
    statusSelect.style.cursor = 'pointer';

    function updateStatusColor() {
      if (statusSelect.value === 'Pending') {
        statusSelect.style.backgroundColor = '#ffd6d6';
        statusSelect.style.color = '#a00000';
      } else if (statusSelect.value === 'In Progress') {
        statusSelect.style.backgroundColor = '#ffe4b3';
        statusSelect.style.color = '#b35900';
      } else if (statusSelect.value === 'Completed') {
        statusSelect.style.backgroundColor = '#c6f5c6';
        statusSelect.style.color = '#2e7d32';
      } else {
        statusSelect.style.backgroundColor = '#fff';
        statusSelect.style.color = '#333';
      }
    }

    updateStatusColor();

    statusSelect.addEventListener('mousedown', ()=> {
      statusSelect.style.backgroundColor = '#fff';
      statusSelect.style.color = '#333';
    });

    statusSelect.addEventListener('change', ()=> {
      logs[index].status = statusSelect.value;
      db.collection('itLogs').doc(logs[index].id).update({status: statusSelect.value})
        .then(()=> {
          updateStatusColor();
          updateWidgets();
          showToast(`Status updated — ${logs[index].employee}: ${logs[index].status}`);
        });
      renderTable(-1);
    });

    row.innerHTML = `
      <td>${log.date}</td>
      <td>${escapeHtml(log.employee)}</td>
      <td>${escapeHtml(log.issue)}</td>
      <td>${escapeHtml(log.action)}</td>
      <td></td>
      <td><button class="delete-btn" onclick="deleteLog('${log.id}')">Delete</button></td>
    `;
    row.children[4].appendChild(statusSelect);
    logBody.appendChild(row);
  });

  updateWidgets();
}

/* Delete log */
function deleteLog(id) {
  if(!confirm('Delete this log?')) return;
  db.collection('itLogs').doc(id).delete()
    .then(()=> {
      logs = logs.filter(l => l.id !== id);
      renderTable(-1);
      showToast(`Deleted log`);
    });
}

/* Add request */
form.addEventListener('submit', e => {
  e.preventDefault();
  const newLog = {
    date: new Date().toISOString(),
    employee: document.getElementById('employee').value,
    issue: document.getElementById('issue').value,
    action: document.getElementById('action').value,
    status: document.getElementById('status').value || 'Pending'
  };
  db.collection('itLogs').add(newLog)
    .then(docRef => {
      newLog.id = docRef.id;
      logs.push(newLog);
      renderTable(logs.length - 1);
      showToast(`New request added — ${newLog.employee}`);
      form.reset();
    });
});

/* ------------------- WIDGETS ------------------- */
function updateWidgets(){
  const total = logs.length;
  const pending = logs.filter(l=>l.status==='Pending').length;
  const inProgress = logs.filter(l=>l.status==='In Progress').length;
  const completed = logs.filter(l=>l.status==='Completed').length;

  totalCountEl.textContent = total;
  pendingCountEl.textContent = pending;
  inProgressCountEl.textContent = inProgress;
  completedCountEl.textContent = completed;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  completionPercentEl.textContent = `${percent}%`;
  const deg = Math.round((percent/100)*360);
  completionCircle.style.background = `conic-gradient(#2e7d32 ${deg}deg, #e6f2ff ${deg}deg)`;

  timelineList.innerHTML = '';
  const recent = logs.slice(-5).reverse();
  recent.forEach(r=>{
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const short = `${r.date} — ${escapeHtml(r.employee)}: ${escapeHtml(r.issue)} (${r.status})`;
    item.textContent = short;
    timelineList.appendChild(item);
  });
}

/* ------------------- LIVE MONITOR ------------------- */
function showToast(text, duration=5000){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  liveMonitor.prepend(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=> t.remove(), 300);
  }, duration);
}

/* ------------------- HELPERS ------------------- */
function escapeHtml(str=''){
  return String(str).replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ------------------- PARTICLES ------------------- */
const particleContainer = document.querySelector('.particle-container');
const particleCount = 30;
for (let i=0;i<particleCount;i++){
  const p = document.createElement('span');
  p.style.left = Math.random()*100 + 'vw';
  p.style.setProperty('--scale', (Math.random()*0.8 + 0.3).toFixed(2));
  p.style.setProperty('--x-move', (Math.random()*50 - 25) + 'vw');
  p.style.animationDuration = (Math.random()*15 + 10) + 's';
  particleContainer.appendChild(p);
}

/* Table and Side Panel Particles */
const tableContainer = document.querySelector('.table-particles');
for(let i=0;i<30;i++){
  const p = document.createElement('span');
  p.style.left = Math.random()*100 + 'vw';
  p.style.animationDuration = (Math.random()*15+10) + 's';
  tableContainer.appendChild(p);
}

const sideContainer = document.querySelector('.side-panel-particles');
for(let i=0;i<20;i++){
  const p = document.createElement('span');
  p.style.left = Math.random()*100 + '%';
  p.style.setProperty('--scale', (Math.random()*0.8+0.3).toFixed(2));
  p.style.setProperty('--x-move', (Math.random()*50-25)+'px');
  p.style.animationDuration = (Math.random()*20+15)+'s';
  sideContainer.appendChild(p);
}

/* Init */
fetchLogsFromFirebase();
