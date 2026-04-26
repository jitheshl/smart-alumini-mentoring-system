import {
  requireAuth, logout, avatarHtml, formatDate, toast,
  adminGetAnalytics, adminGetPending, adminApprove, adminBlockUser, adminUnblockUser,
  adminGetComplaints, adminComplaintAction, adminGetUsers, adminGetJobs, deleteJob,
  adminGetMeetings
} from '/js/api.js';
import { initDashboardChat } from '/js/dashboard-chat.js';

const user = requireAuth(['admin']);
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

// ─── Tab Navigation ────────────────────────────────────────────────────────────
const titleMap = {
  analytics:  ['Analytics',       'Platform overview and statistics'],
  pending:    ['Pending Alumni',  'Alumni accounts awaiting your approval'],
  users:      ['All Users',       'Manage students and alumni accounts'],
  complaints: ['Complaints',      'Reported issues by students'],
  jobs:       ['Monitor Jobs',    'All job postings on the platform'],
  meetings:   ['Meetings Monitor','All 1-on-1 meeting sessions on the platform'],
  chat:       ['Chat',            'Secure messaging between users']
};

let currentTab = 'analytics';
const loaders  = { analytics: loadAnalytics, pending: loadPending, users: loadUsers, complaints: loadComplaints, jobs: loadJobs, meetings: loadMeetings, chat: loadChat };

function switchTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.admin-nav').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).style.display = '';
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('page-title').textContent    = titleMap[tab][0];
  document.getElementById('page-subtitle').textContent = titleMap[tab][1];
  currentTab = tab;
  loaders[tab]?.();
}

document.querySelectorAll('.admin-nav').forEach(btn => {
  btn.addEventListener('click', (e) => { e.preventDefault(); switchTab(btn.dataset.tab); });
});
document.getElementById('refresh-btn').addEventListener('click', () => loaders[currentTab]?.());

// ─── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  const grid = document.getElementById('analytics-grid');
  grid.innerHTML = '<div class="flex-center" style="grid-column:1/-1;padding:40px 0;"><div class="spinner"></div></div>';
  try {
    const { analytics: a } = await adminGetAnalytics();
    const cards = [
      { icon:'👨‍🎓', label:'Total Students',   value: a.totalStudents,   color:'accent'  },
      { icon:'👨‍💼', label:'Approved Alumni',  value: a.totalAlumni,     color:'success' },
      { icon:'⏳',   label:'Pending Alumni',   value: a.pendingAlumni,   color:'warning' },
      { icon:'💼',   label:'Job Listings',     value: a.totalJobs,       color:'info'    },
      { icon:'📨',   label:'Total Requests',   value: a.totalRequests,   color:'accent'  },
      { icon:'🚩',   label:'Open Complaints',  value: a.openComplaints,  color:'danger'  },
      { icon:'📅',   label:'Total Meetings',   value: a.totalMeetings ?? 0, color:'info' },
    ];
    grid.innerHTML = cards.map(c => `
      <div class="stat-card ${c.color}">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>`).join('');

    // Update badges
    const pb = document.getElementById('pending-badge');
    const cb = document.getElementById('complaints-badge');
    if (a.pendingAlumni   > 0) { pb.textContent = a.pendingAlumni;  pb.style.display = ''; }
    if (a.openComplaints  > 0) { cb.textContent = a.openComplaints; cb.style.display = ''; }
  } catch (err) {
    toast.error('Analytics failed: ' + err.message);
  }
}

// ─── Pending Alumni ─────────────────────────────────────────────────────────────
async function loadPending() {
  const tbody = document.getElementById('pending-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">Loading…</td></tr>';
  try {
    const { alumni } = await adminGetPending();
    if (!alumni.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">✅ No pending alumni</td></tr>';
      return;
    }
    tbody.innerHTML = alumni.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatarHtml(a, 'sm')}
            <div>
              <div style="font-weight:600;color:var(--text-primary);">${a.name}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">${a.email}</div>
            </div>
          </div>
        </td>
        <td>${a.branch || '—'}</td>
        <td>${a.company || '—'}</td>
        <td>${a.jobRole || '—'}</td>
        <td>${a.passOutYear || '—'}</td>
        <td>
          <div class="action-group">
            <button class="btn btn-success btn-sm approve-btn" data-id="${a._id}">✅ Approve</button>
            <button class="btn btn-danger btn-sm block-btn" data-id="${a._id}">🚫 Block</button>
          </div>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = '…';
        try { await adminApprove(btn.dataset.id); toast.success('Alumni approved!'); loadPending(); loadAnalytics(); }
        catch (err) { toast.error(err.message); btn.disabled = false; btn.textContent = '✅ Approve'; }
      });
    });
    tbody.querySelectorAll('.block-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Block this alumni?')) return;
        btn.disabled = true;
        try { await adminBlockUser(btn.dataset.id); toast.warning('User blocked'); loadPending(); }
        catch (err) { toast.error(err.message); btn.disabled = false; }
      });
    });
  } catch (err) {
    toast.error('Failed: ' + err.message);
  }
}

// ─── All Users ──────────────────────────────────────────────────────────────────
let allUsers    = [];
let roleFilter  = 'all';
let userSearch  = '';

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">Loading…</td></tr>';
  try {
    const { users } = await adminGetUsers();
    allUsers = users || [];
    renderUsersTable();
  } catch (err) {
    toast.error('Failed to load users: ' + err.message);
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  let filtered = allUsers;
  if (roleFilter !== 'all') filtered = filtered.filter(u => u.role === roleFilter);
  if (userSearch) filtered = filtered.filter(u =>
    u.name?.toLowerCase().includes(userSearch) ||
    u.email?.toLowerCase().includes(userSearch)
  );
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${avatarHtml(u, 'sm')}
          <div>
            <div style="font-weight:600;color:var(--text-primary);">${u.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${u.email}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${u.role==='alumni'?'badge-success':'badge-accent'}">${u.role}</span></td>
      <td>${u.branch || '—'}</td>
      <td>${u.company || '—'}</td>
      <td>
        ${u.isBlocked ? '<span class="badge badge-danger badge-dot">Blocked</span>'
          : u.role === 'alumni' && !u.isApproved ? '<span class="badge badge-warning badge-dot">Pending</span>'
          : '<span class="badge badge-success badge-dot">Active</span>'}
      </td>
      <td>
        <div class="action-group">
          ${u.role === 'alumni' && !u.isApproved && !u.isBlocked
            ? `<button class="btn btn-success btn-sm" data-action="approve" data-id="${u._id}">✅ Approve</button>` : ''}
          ${u.isBlocked
            ? `<button class="btn btn-secondary btn-sm" data-action="unblock" data-id="${u._id}">🔓 Unblock</button>`
            : `<button class="btn btn-danger btn-sm" data-action="block" data-id="${u._id}">🚫 Block</button>`}
        </div>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await adminApprove(btn.dataset.id); toast.success('Approved!'); loadUsers(); loadAnalytics(); }
      catch (err) { toast.error(err.message); btn.disabled = false; }
    });
  });
  tbody.querySelectorAll('[data-action="block"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Block this user?')) return;
      btn.disabled = true;
      try { await adminBlockUser(btn.dataset.id); toast.warning('User blocked'); loadUsers(); }
      catch (err) { toast.error(err.message); btn.disabled = false; }
    });
  });
  tbody.querySelectorAll('[data-action="unblock"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await adminUnblockUser(btn.dataset.id); toast.success('User unblocked'); loadUsers(); }
      catch (err) { toast.error(err.message); btn.disabled = false; }
    });
  });
}

document.getElementById('user-search').addEventListener('input', function () {
  userSearch = this.value.toLowerCase(); renderUsersTable();
});
document.getElementById('role-filter').addEventListener('change', function () {
  roleFilter = this.value; renderUsersTable();
});

// ─── Complaints ─────────────────────────────────────────────────────────────────
async function loadComplaints() {
  const container = document.getElementById('complaints-list');
  container.innerHTML = '<div class="flex-center" style="padding:60px 0;"><div class="spinner"></div></div>';
  try {
    const { complaints } = await adminGetComplaints();
    if (!complaints.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><h3>No complaints</h3></div>`;
      return;
    }

    const statusBadge = (s) => {
      const map = { open:'warning', warned:'danger', blocked:'danger', ignored:'muted' };
      return `<span class="badge badge-${map[s]||'muted'} badge-dot">${s}</span>`;
    };

    container.innerHTML = complaints.map(c => `
      <div class="complaint-card" data-id="${c._id}">
        <div class="complaint-card-header">
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px;">FROM STUDENT</div>
              <div style="font-weight:600;">${c.studentId?.name || 'Unknown'}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">${c.studentId?.email || ''}</div>
            </div>
            <div style="display:flex;align-items:center;color:var(--text-muted);">→</div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px;">REPORTED ALUMNI</div>
              <div style="font-weight:600;">${c.alumniId?.name || 'Unknown'}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">${c.alumniId?.email || ''}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            ${statusBadge(c.status)}
            <span style="font-size:0.75rem;color:var(--text-muted);">${formatDate(c.createdAt)}</span>
          </div>
        </div>
        <div class="complaint-card-msg" style="margin:14px 0;">${c.message}</div>
        ${c.meetingId ? `
          <div style="margin-bottom:12px;padding:8px 12px;background:var(--bg-elevated);border-radius:var(--radius-md);border-left:3px solid var(--accent);font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;">
            🔗 <strong>Meeting Linked:</strong> ${c.meetingId.reason?.substring(0,60) || 'N/A'}…
            <span class="badge badge-muted" style="margin-left:auto;">${c.meetingId.status || ''}</span>
          </div>` : ''}
        ${c.evidence ? `<a href="${c.evidence}" target="_blank" class="btn btn-ghost btn-sm" style="margin-bottom:12px;">📎 View Evidence</a>` : ''}
        ${c.status === 'open' ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm complaint-action" data-id="${c._id}" data-action="ignore">🙈 Ignore</button>
            <button class="btn btn-secondary btn-sm complaint-action" data-id="${c._id}" data-action="warn">⚠️ Warn Alumni</button>
            <button class="btn btn-danger btn-sm complaint-action" data-id="${c._id}" data-action="block">🚫 Block Alumni</button>
          </div>` : '<div class="text-xs text-muted">Action already taken</div>'}
      </div>`).join('');

    container.querySelectorAll('.complaint-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        if (action === 'block' && !confirm('Block this alumni? They will be removed from the platform.')) return;
        btn.disabled = true;
        try {
          await adminComplaintAction(btn.dataset.id, action);
          toast.success(`Action "${action}" applied`);
          loadComplaints(); loadAnalytics();
        } catch (err) { toast.error(err.message); btn.disabled = false; }
      });
    });
  } catch (err) {
    toast.error('Failed to load complaints: ' + err.message);
  }
}

// ─── Jobs ──────────────────────────────────────────────────────────────────────
async function loadJobs() {
  const grid = document.getElementById('admin-jobs-grid');
  grid.innerHTML = '<div class="flex-center" style="grid-column:1/-1;padding:60px 0;"><div class="spinner"></div></div>';
  try {
    const { jobs } = await adminGetJobs();
    if (!jobs.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">💼</div><h3>No jobs posted yet</h3></div>`;
      return;
    }
    grid.innerHTML = jobs.map(j => `
      <div class="job-card">
        <div class="job-card-header">
          <div>
            <div class="job-card-title">${j.title}</div>
            <div class="job-card-company">🏢 ${j.company}</div>
          </div>
          <span class="badge ${j.type === 'internship' ? 'badge-info' : 'badge-accent'}">${j.type}</span>
        </div>
        <div class="job-card-desc">${j.description}</div>
        <div class="job-card-footer">
          <div class="job-card-meta">
            ${j.postedBy?.name ? `👤 ${j.postedBy.name}` : ''} · 📅 ${formatDate(j.createdAt)}
          </div>
          <button class="btn btn-danger btn-sm" data-id="${j._id}" onclick="this.disabled=true;deleteJobAdmin('${j._id}',this)">🗑 Remove</button>
        </div>
      </div>`).join('');
  } catch (err) {
    toast.error('Failed to load jobs: ' + err.message);
  }
}

// Expose for inline onclick
window.deleteJobAdmin = async (id, btn) => {
  if (!confirm('Remove this job?')) { btn.disabled = false; return; }
  try { await deleteJob(id); toast.success('Job removed'); loadJobs(); }
  catch (err) { toast.error(err.message); btn.disabled = false; }
};

// ─── Meetings Monitor ──────────────────────────────────────────────────────────
async function loadMeetings() {
  const tbody = document.getElementById('meetings-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">Loading…</td></tr>';
  try {
    const { meetings } = await adminGetMeetings();
    if (!meetings.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">📅 No meetings yet</td></tr>';
      return;
    }
    const statusBadge = (s) => {
      const map = { requested:'warning', slots_provided:'info', scheduled:'success', completed:'muted', cancelled:'danger' };
      const labels = { requested:'⏳ Requested', slots_provided:'📅 Slots Sent', scheduled:'✅ Scheduled', completed:'🎉 Completed', cancelled:'❌ Cancelled' };
      return `<span class="badge badge-${map[s]||'muted'} badge-dot">${labels[s]||s}</span>`;
    };
    tbody.innerHTML = meetings.map(m => {
      const slotDate = m.selectedSlot?.date
        ? new Date(m.selectedSlot.date).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })
        : '—';
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              ${avatarHtml(m.studentId, 'sm')}
              <div>
                <div style="font-weight:600;color:var(--text-primary);">${m.studentId?.name || '—'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${m.studentId?.email || ''}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              ${avatarHtml(m.alumniId, 'sm')}
              <div>
                <div style="font-weight:600;color:var(--text-primary);">${m.alumniId?.name || '—'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${m.alumniId?.company || ''}</div>
              </div>
            </div>
          </td>
          <td style="max-width:200px;">
            <div style="font-size:0.82rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${m.reason}">${m.reason}</div>
          </td>
          <td>${statusBadge(m.status)}</td>
          <td style="font-size:0.82rem;">${slotDate}</td>
          <td style="font-size:0.78rem;color:var(--text-muted);">${formatDate(m.createdAt)}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    toast.error('Failed to load meetings: ' + err.message);
  }
}

let chatReady = false;
async function loadChat() {
  if (chatReady) return;
  await initDashboardChat(user);
  chatReady = true;
}

// Also enhance loadComplaints to show meeting reference
// (meeting data is now populated from server via populate('meetingId'))

// ─── Init ──────────────────────────────────────────────────────────────────────
switchTab('analytics');
