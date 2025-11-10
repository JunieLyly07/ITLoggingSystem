/* ------------------- CORE LOGIC ------------------- */
const form = document.getElementById('requestForm');
const logBody = document.getElementById('logTable').querySelector('tbody');

let logs = []; // fetched from Firestore

/* UI elements for widgets */
const totalCountEl = document.getElementById('totalCount');
const pendingCountEl = document.getElementById('pendingCount');
const inProgressCountEl = document.getElementById('inProgressCount');
const completedCountEl = document.getElementById('completedCount');
const completionCircle = document.getElementById('completionCircle');
const completionPercentEl = document.getElementById('completionPercent');
const timelineList = document.getElementById('timelineList');
const liveMonitor = document.getElementById('liveMonitor');

/* ------------------- FIRESTORE ------------------- */
const logsCollection = db.collection('itLogs');

async function fetchLogsFromFirebase() {
  const snapshot = await logsCollection.orderBy('timestamp', 'desc').get();
  logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderTable();
}

fetchLogsFromFirebase();

/* Render table */
function renderTable(newIndex = -1) {
  logBody.innerHTML = '';
  logs.forEach((log, index) => {
    const row = document.createElement('tr');
    if(index === newIndex) row.classList.add('new-row');

    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = `
      <option value="Pending">Pending</option>
      <option value="In Progress">In Progress</option>
      <option value="Completed">Completed</option>
    `;
    statusSelect.value = log.status || 'Pending';

    function updateStatusColor() {
      if (statusSelect.value === 'Pending') { statusSelect.style.backgroundColor='#ffd6d6'; statusSelect.style.color='#a00000'; }
      else if (statusSelect.value === 'In Progress') { statusSelect.style.backgroundColor='#ffe4b3'; statusSelect.style.color='#b35900'; }
      else if (statusSelect.value === 'Completed') { statusSelect.style.backgroundColor='#c6f5c6'; statusSelect.style.color='#2e7d32'; }
      else { statusSelect.style.backgroundColor='#fff'; statusSelect.style.color='#333'; }
    }
    updateStatusColor();

    statusSelect.addEventListener('mousedown', ()=> { statusSelect.style.backgroundColor='#fff'; statusSelect.style.color='#333'; });
    statusSelect.addEventListener('change', async ()=> {
      logs[index].status = statusSelect.value;
      await logsCollection.doc(logs[index].id).update({ status: statusSelect.value });
      updateStatusColor();
      updateWidgets();
      showToast(`Status updated — ${logs[index].employee}: ${logs[index].status}`);
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
async function deleteLog(id) {
  if (!confirm('Delete this log?')) return;
  const doc = logs.find(l => l.id === id);
  await logsCollection.doc(id).delete();
  logs = logs.filter(l => l.id !== id);
  renderTable(-1);
  showToast(`Deleted — ${doc.employee}`);
}

/* Add request */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const newLog = {
    date: new Date().toLocaleString(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    employee: document.getElementById('employee').value,
    issue: document.getElementById('issue').value,
    action: document.getElementById('action').value,
    status: document.getElementById('status').value || 'Pending'
  };
  const docRef = await logsCollection.add(newLog);
  logs.unshift({ id: docRef.id, ...newLog });
  form.reset();
  renderTable(0);
  showToast(`New request added — ${newLog.employee}`);
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
  const deg = Math.round((percent/100) * 360);
  completionCircle.style.background = `conic-gradient(#2e7d32 ${deg}deg, #e6f2ff ${deg}deg)`;

  timelineList.innerHTML = '';
  const recent = logs.slice(0,5);
  recent.forEach(r=>{
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.textContent = `${r.date} — ${escapeHtml(r.employee)}: ${escapeHtml(r.issue)} (${r.status})`;
    timelineList.appendChild(item);
  });
}

/* ------------------- LIVE MONITOR (toasts) ------------------- */
function showToast(text, duration = 5000){
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
for (let i=0;i<30;i++){
  const p = document.createElement('span');
  p.style.left = Math.random()*100 + 'vw';
  p.style.setProperty('--scale', (Math.random()*0.8 + 0.3).toFixed(2));
  p.style.setProperty('--x-move', (Math.random()*50 - 25) + 'vw');
  p.style.animationDuration = (Math.random()*15 + 10) + 's';
  particleContainer.appendChild(p);
}
