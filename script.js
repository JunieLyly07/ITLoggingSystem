/* ------------------- CORE LOGIC ------------------- */
const form = document.getElementById('requestForm');
const logBody = document.getElementById('logTable').querySelector('tbody');

let logs = JSON.parse(localStorage.getItem('itLogs')) || [];

/* UI elements for widgets */
const totalCountEl = document.getElementById('totalCount');
const pendingCountEl = document.getElementById('pendingCount');
const inProgressCountEl = document.getElementById('inProgressCount');
const completedCountEl = document.getElementById('completedCount');
const completionCircle = document.getElementById('completionCircle');
const completionPercentEl = document.getElementById('completionPercent');
const timelineList = document.getElementById('timelineList');
const liveMonitor = document.getElementById('liveMonitor');

/* Render table; if newIndex >=0 then animate only the new row */
function renderTable(newIndex = -1) {
  logBody.innerHTML = '';
  logs.forEach((log, index) => {
    const row = document.createElement('tr');
    if(index === newIndex) {
      row.classList.add('new-row');
      row.addEventListener('animationend', ()=> row.classList.remove('new-row'));
    }

    // status select element
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

    statusSelect.addEventListener('mousedown', ()=>{
      statusSelect.style.backgroundColor = '#fff';
      statusSelect.style.color = '#333';
    });

    statusSelect.addEventListener('change', ()=>{
      logs[index].status = statusSelect.value;
      localStorage.setItem('itLogs', JSON.stringify(logs));
      updateStatusColor();
      updateWidgets();
      showToast(`Status updated — ${logs[index].employee}: ${logs[index].status}`);
      renderTable(-1);
    });

    // Action Taken cell with show more/less
    const actionCellContent = `
      <td class="action-cell">
        <div class="action-text" data-full="${escapeHtml(log.action)}">
          ${escapeHtml(log.action).length > 150 ? escapeHtml(log.action).slice(0, 150) + '...' : escapeHtml(log.action)}
        </div>
        ${escapeHtml(log.action).length > 150 ? '<span class="toggle-action">Show more</span>' : ''}
      </td>
    `;

    row.innerHTML = `
      <td>${log.date}</td>
      <td>${escapeHtml(log.employee)}</td>
      <td>${escapeHtml(log.issue)}</td>
      ${actionCellContent}
      <td></td>
      <td><button class="delete-btn" onclick="deleteLog(${index})">Delete</button></td>
    `;

    // append status dropdown to correct cell
    const statusCell = row.querySelector('td:nth-child(5)');
    if(statusCell) statusCell.appendChild(statusSelect);

    // style delete button similar to status
    const deleteBtn = row.querySelector('.delete-btn');
    deleteBtn.style.borderRadius = '20px';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.padding = '5px 10px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.backgroundColor = '#ffd6d6';
    deleteBtn.style.color = '#a00000';
    deleteBtn.style.border = 'none';
    deleteBtn.addEventListener('mouseenter', ()=>deleteBtn.style.opacity=0.8);
    deleteBtn.addEventListener('mouseleave', ()=>deleteBtn.style.opacity=1);

    logBody.appendChild(row);
  });

  updateWidgets();
}

/* Delete log (exposed globally) */
function deleteLog(index) {
  if (!confirm('Delete this log?')) return;
  const removed = logs.splice(index,1)[0];
  localStorage.setItem('itLogs', JSON.stringify(logs));
  renderTable(-1);
  showToast(`Deleted — ${removed.employee}`);
}

/* Add request */
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const newLog = {
    date: new Date().toLocaleString(),
    employee: document.getElementById('employee').value,
    issue: document.getElementById('issue').value,
    action: document.getElementById('action').value,
    status: document.getElementById('status').value || 'Pending'
  };
  logs.push(newLog);
  localStorage.setItem('itLogs', JSON.stringify(logs));
  form.reset();
  renderTable(logs.length - 1);
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

  // completion percent
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  completionPercentEl.textContent = `${percent}%`;
  const deg = Math.round((percent/100) * 360);
  completionCircle.style.background = `conic-gradient(#2e7d32 ${deg}deg, #e6f2ff ${deg}deg)`;

  // update timeline (most recent 5)
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
const particleCount = 30;
for (let i=0;i<particleCount;i++){
  const p = document.createElement('span');
  p.style.left = Math.random()*100 + 'vw';
  p.style.setProperty('--scale', (Math.random()*0.8 + 0.3).toFixed(2));
  p.style.setProperty('--x-move', (Math.random()*50 - 25) + 'vw');
  p.style.animationDuration = (Math.random()*15 + 10) + 's';
  particleContainer.appendChild(p);
}

/* Init */
renderTable();

/* ------------------- DARK MODE TOGGLE ------------------- */
const darkModeIcon = document.createElement('div');
darkModeIcon.id = 'darkModeIcon';
darkModeIcon.style.cssText = 'position: fixed; bottom: 18px; right: 18px; cursor: pointer; z-index: 9999; font-size: 24px;';
darkModeIcon.innerHTML = '<span>🌙</span>';
document.body.appendChild(darkModeIcon);

// Load last preference
if(localStorage.getItem('darkMode') === 'enabled'){
  document.body.classList.add('dark-mode');
  darkModeIcon.querySelector('span').textContent = '☀️';
}

darkModeIcon.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  darkModeIcon.querySelector('span').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  showToast(isDark ? "Dark mode enabled" : "Light mode enabled", 2000);
});

/* ------------------- ELEGANT BUTTON CLICK BURST ------------------- */
form.addEventListener('submit', (e) => {
  const btn = e.target.querySelector('button');
  const rect = btn.getBoundingClientRect();
  const color = document.body.classList.contains('dark-mode') ? '#90ee90' : '#1e90ff';

  for (let i = 0; i < 10; i++) {
    const p = document.createElement('span');
    p.style.position = 'fixed';
    p.style.left = `${rect.left + rect.width / 2}px`;
    p.style.top = `${rect.top + rect.height / 2}px`;
    p.style.width = '6px';
    p.style.height = '6px';
    p.style.backgroundColor = color;
    p.style.transform = 'rotate(45deg) scale(0.8)';
    p.style.opacity = 0.9;
    p.style.borderRadius = '2px';
    p.style.pointerEvents = 'none';
    p.style.boxShadow = `0 0 6px ${color}, 0 0 12px ${color}`;
    p.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
    document.body.appendChild(p);

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 50 + 20;

    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(${Math.random()*360}deg) scale(0)`;
      p.style.opacity = 0;
      setTimeout(() => p.remove(), 600);
    });
  }
});

/* ------------------- SHOW MORE / SHOW LESS FOR ACTION TAKEN ------------------- */
logBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('toggle-action')) {
    const toggle = e.target;
    const cell = toggle.closest('.action-cell');
    const textDiv = cell.querySelector('.action-text');
    const full = textDiv.getAttribute('data-full');
    const short = full.length > 150 ? full.slice(0, 150) + '...' : full;

    const expanded = toggle.getAttribute('data-expanded') === 'true';
    if (expanded) {
      textDiv.textContent = short;
      toggle.textContent = 'Show more';
      toggle.setAttribute('data-expanded', 'false');
    } else {
      textDiv.textContent = full;
      toggle.textContent = 'Show less';
      toggle.setAttribute('data-expanded', 'true');
    }
  }
});
