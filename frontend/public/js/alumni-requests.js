import {
  requireAuth, logout, getIncoming, respondToRequest,
  avatarHtml, formatDate, toast
} from '/js/api.js';

const user = requireAuth(['alumni']);
if (!user) throw new Error('Unauthorized');

document.getElementById('sb-name').textContent = user.name;
document.getElementById('sb-avatar').innerHTML = avatarHtml(user, 'sm');
document.getElementById('logout-btn').addEventListener('click', logout);

const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  sidebar.classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
});

let allRequests = [];
let currentFilter = 'pending';

const statusBadge = (s) => {
  const map  = { pending:'warning', accepted:'success', rejected:'danger' };
  const icon = { pending:'⏳', accepted:'✅', rejected:'❌' };
  return `<span class="badge badge-${map[s]||'muted'} badge-dot">${icon[s]||''} ${s}</span>`;
};

function renderRequests(list) {
  const container = document.getElementById('requests-list');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>No ${currentFilter === 'all' ? '' : currentFilter} requests</h3>
      <p>Student requests will appear here</p>
    </div>`; return;
  }
  container.innerHTML = list.map(r => `
    <div class="request-card" style="margin-bottom:12px;">
      <div class="request-card-left">
        ${avatarHtml(r.studentId, 'md')}
        <div class="request-card-info">
          <div class="request-card-name">${r.studentId?.name || 'Unknown Student'}</div>
          <div class="request-card-sub">
            ${r.studentId?.branch ? `<span>📚 ${r.studentId.branch}</span>` : ''}
            ${r.studentId?.year ? ` · ${r.studentId.year}` : ''}
          </div>
          ${r.message ? `<div class="text-xs" style="color:var(--text-secondary);margin-top:5px;font-style:italic;">"${r.message}"</div>` : ''}
          <div class="text-xs text-muted" style="margin-top:4px;">📅 ${formatDate(r.createdAt)}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        ${statusBadge(r.status)}
        ${r.status === 'pending' ? `
          <div style="display:flex;gap:6px;">
            <button class="btn btn-success btn-sm accept-btn" data-id="${r._id}">✅ Accept</button>
            <button class="btn btn-danger btn-sm reject-btn" data-id="${r._id}">❌ Decline</button>
          </div>` : ''}
      </div>
    </div>`).join('');

  container.querySelectorAll('.accept-btn').forEach(b => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await respondToRequest(b.dataset.id, 'accepted'); toast.success('Request accepted!'); load(); }
      catch (err) { toast.error(err.message); b.disabled = false; }
    });
  });
  container.querySelectorAll('.reject-btn').forEach(b => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await respondToRequest(b.dataset.id, 'rejected'); toast.info('Request declined'); load(); }
      catch (err) { toast.error(err.message); b.disabled = false; }
    });
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.status;
    const filtered = currentFilter === 'all' ? allRequests : allRequests.filter(r => r.status === currentFilter);
    renderRequests(filtered);
  });
});

async function load() {
  try {
    const { requests } = await getIncoming();
    allRequests = requests || [];
    const filtered = currentFilter === 'all' ? allRequests : allRequests.filter(r => r.status === currentFilter);
    renderRequests(filtered);
  } catch (err) {
    toast.error('Failed to load requests: ' + err.message);
  }
}

load();
