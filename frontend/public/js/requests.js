import { requireAuth, logout, getMyRequests, requestMeeting, avatarHtml, formatDate, toast } from '/js/api.js';

const user = requireAuth(['student']);
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
let currentFilter = 'all';

const statusBadge = (s) => {
  const map = { pending: 'warning', accepted: 'success', rejected: 'danger' };
  const icons = { pending: '⏳', accepted: '✅', rejected: '❌' };
  return `<span class="badge badge-${map[s]||'muted'} badge-dot">${icons[s]||''} ${s}</span>`;
};

function renderRequests(requests) {
  const container = document.getElementById('requests-list');
  if (!requests.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>No ${currentFilter === 'all' ? '' : currentFilter} requests</h3>
      <p>Your mentorship requests will appear here</p>
    </div>`;
    return;
  }
  container.innerHTML = requests.map(r => `
    <div class="request-card" style="flex-wrap:wrap;gap:12px;">
      <div class="request-card-left">
        ${avatarHtml(r.alumniId, 'md')}
        <div class="request-card-info">
          <div class="request-card-name">${r.alumniId?.name || 'Unknown'}</div>
          <div class="request-card-sub">
            ${r.alumniId?.company ? `🏢 ${r.alumniId.company}` : ''}
            ${r.alumniId?.jobRole ? ` · ${r.alumniId.jobRole}` : ''}
          </div>
          ${r.message ? `<div class="text-xs text-muted mt-1" style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${r.message}"</div>` : ''}
        </div>
      </div>
      <div class="flex flex-col gap-1" style="align-items:flex-end;">
        ${statusBadge(r.status)}
        <span class="text-xs text-muted">${formatDate(r.createdAt)}</span>
        ${r.status === 'accepted' ? `
          <button class="btn btn-sm meeting-req-btn" data-alumni-id="${r.alumniId?._id}" data-alumni-name="${r.alumniId?.name}"
            style="margin-top:4px;background:var(--success-soft);color:var(--success);border:1px solid rgba(0,212,170,0.25);">
            📅 Request Meeting
          </button>` : ''}
      </div>
    </div>`).join('');

  container.querySelectorAll('.meeting-req-btn').forEach(btn => {
    btn.addEventListener('click', () => openMeetingModal(btn.dataset.alumniId, btn.dataset.alumniName));
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
    const { requests } = await getMyRequests();
    allRequests = requests || [];
    renderRequests(allRequests);
  } catch (err) {
    toast.error('Failed to load requests: ' + err.message);
  }
}

// ── Meeting modal ────────────────────────────────────────────────────────────
function openMeetingModal(alumniId, alumniName) {
  document.getElementById('meeting-alumni-id').value = alumniId;
  document.getElementById('meeting-alumni-name').textContent = alumniName;
  document.getElementById('meeting-reason').value = '';
  document.getElementById('meeting-modal').classList.add('open');
}

document.getElementById('close-meeting-modal').addEventListener('click', () =>
  document.getElementById('meeting-modal').classList.remove('open'));
document.getElementById('cancel-meeting-modal').addEventListener('click', () =>
  document.getElementById('meeting-modal').classList.remove('open'));
document.getElementById('meeting-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('send-meeting-btn').addEventListener('click', async () => {
  const reason = document.getElementById('meeting-reason').value.trim();
  const alumniId = document.getElementById('meeting-alumni-id').value;
  if (!alumniId) { toast.error('Mentor not selected. Please try again.'); return; }
  if (!reason || reason.length < 10) { toast.warning('Please provide a reason (min 10 chars)'); return; }
  const btn = document.getElementById('send-meeting-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await requestMeeting({ mentorId: alumniId, alumniId, studentId: user._id, reason });
    toast.success('Meeting request sent! 📅');
    document.getElementById('meeting-modal').classList.remove('open');
  } catch (err) {
    if ((err.message || '').toLowerCase().includes('active meeting request')) {
      toast.info('You already have an active request. Opening Meetings…');
      setTimeout(() => { window.location.href = '/student/meetings.html'; }, 700);
      return;
    }
    toast.error(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '📅 Send Meeting Request';
  }
});

load();
