import {
  requireAuth, logout, getIncoming, respondToRequest, getMyJobs, getIncomingMeetings,
  avatarHtml, formatDate, toast
} from '/js/api.js';
import { initDashboardChat } from '/js/dashboard-chat.js';

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

const hour = new Date().getHours();
const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
document.getElementById('greeting-text').textContent = `${greet}, ${user.name.split(' ')[0]}! Ready to inspire someone today?`;

async function loadDashboard() {
  try {
    const [reqData, jobsData, meetData] = await Promise.all([
      getIncoming(),
      getMyJobs(),
      getIncomingMeetings().catch(() => ({ meetings: [] }))
    ]);
    const requests = reqData.requests || [];
    const meetings = meetData.meetings || [];
    const pending  = requests.filter(r => r.status === 'pending');
    const accepted = requests.filter(r => r.status === 'accepted');
    const pendingMeetings = meetings.filter(m => m.status === 'requested');

    document.getElementById('stat-incoming').textContent  = pending.length;
    document.getElementById('stat-accepted').textContent  = accepted.length;
    document.getElementById('stat-jobs').textContent      = jobsData.jobs?.length ?? 0;
    const meetStat = document.getElementById('stat-meetings');
    if (meetStat) meetStat.textContent = meetings.filter(m => !['completed','cancelled'].includes(m.status)).length;

    renderIncoming(pending);
    renderIncomingMeetings(pendingMeetings);
  } catch (err) {
    toast.error('Failed to load dashboard: ' + err.message);
  }
}

async function respond(id, status, btn) {
  btn.disabled = true;
  try {
    await respondToRequest(id, status);
    toast.success(`Request ${status}!`);
    loadDashboard();
  } catch (err) {
    toast.error(err.message);
    btn.disabled = false;
  }
}

function renderIncoming(requests) {
  const container = document.getElementById('incoming-requests');
  if (!requests.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>No pending requests</h3>
      <p>Students will appear here when they send mentorship requests</p>
    </div>`; return;
  }
  container.innerHTML = requests.map(r => `
    <div class="request-card" style="margin-bottom:12px;">
      <div class="request-card-left">
        ${avatarHtml(r.studentId, 'md')}
        <div class="request-card-info">
          <div class="request-card-name">${r.studentId?.name || 'Unknown'}</div>
          <div class="request-card-sub">${r.studentId?.branch || ''} ${r.studentId?.year ? '· ' + r.studentId.year : ''}</div>
          ${r.message ? `<div class="text-xs" style="color:var(--text-secondary);margin-top:4px;max-width:400px;">"${r.message}"</div>` : ''}
        </div>
      </div>
      <div class="action-group" style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn btn-success btn-sm accept-btn" data-id="${r._id}">✅ Accept</button>
        <button class="btn btn-danger btn-sm reject-btn" data-id="${r._id}">❌ Decline</button>
      </div>
    </div>`).join('');

  container.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', () => respond(b.dataset.id, 'accepted', b)));
  container.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', () => respond(b.dataset.id, 'rejected', b)));
}

function renderIncomingMeetings(meetings) {
  const container = document.getElementById('incoming-meetings');
  if (!container) return;
  if (!meetings.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 0;">
      <div class="empty-state-icon">📅</div>
      <h3>No pending meeting requests</h3>
      <p>When a student requests a 1-on-1 session, it will appear here.</p>
      <a href="/alumni/meetings.html" class="btn btn-ghost btn-sm" style="margin-top:12px;">View All Meetings</a>
    </div>`; return;
  }
  container.innerHTML = meetings.slice(0, 3).map(m => `
    <div class="meeting-card">
      <div class="meeting-card-header">
        <div style="display:flex;gap:12px;align-items:center;">
          ${avatarHtml(m.studentId, 'sm')}
          <div>
            <div style="font-weight:600;color:var(--text-primary);">${m.studentId?.name || 'Student'}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${m.studentId?.branch || ''} ${m.studentId?.year ? '· ' + m.studentId.year : ''}</div>
          </div>
        </div>
        <span class="badge status-requested">⏳ Pending</span>
      </div>
      <div class="meeting-reason">"${m.reason}"</div>
      <div style="display:flex;gap:8px;">
        <a href="/alumni/meetings.html" class="btn btn-primary btn-sm">📅 Provide Slots</a>
        <span class="text-xs text-muted" style="align-self:center;">${formatDate(m.createdAt)}</span>
      </div>
    </div>`).join('');
}

loadDashboard();
initDashboardChat(user);
