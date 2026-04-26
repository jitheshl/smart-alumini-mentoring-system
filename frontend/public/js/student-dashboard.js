import {
  requireAuth, logout, getMyRequests, getAlumni, getJobs, getMyMeetings,
  avatarHtml, formatDate, toast
} from '/js/api.js';

// Guard
const user = requireAuth(['student']);
if (!user) throw new Error('Unauthorized');

// Inject sidebar info
document.getElementById('sb-name').textContent = user.name;
document.getElementById('sb-avatar').innerHTML = avatarHtml(user, 'sm');
document.getElementById('logout-btn').addEventListener('click', logout);

// Mobile sidebar toggle
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  sidebar.classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
});

// Greeting
const hour = new Date().getHours();
const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
document.getElementById('greeting-text').textContent = `${greet}, ${user.name.split(' ')[0]}! Here's what's happening.`;

// Load stats + recent requests + meetings
async function loadDashboard() {
  try {
    const [reqData, alumniData, jobsData, meetingsData] = await Promise.all([
      getMyRequests(),
      getAlumni(),
      getJobs(),
      getMyMeetings().catch(() => ({ meetings: [] }))
    ]);

    const requests = reqData.requests || [];
    const meetings = meetingsData.meetings || [];
    const pending  = requests.filter(r => r.status === 'pending').length;
    const accepted = requests.filter(r => r.status === 'accepted').length;
    const activeMeetings = meetings.filter(m => !['completed', 'cancelled'].includes(m.status)).length;

    document.getElementById('stat-mentors').textContent  = alumniData.alumni?.length ?? 0;
    document.getElementById('stat-jobs').textContent     = jobsData.jobs?.length ?? 0;
    document.getElementById('stat-pending').textContent  = pending;
    document.getElementById('stat-accepted').textContent = accepted;
    const meetingStat = document.getElementById('stat-meetings');
    if (meetingStat) meetingStat.textContent = activeMeetings;

    // Badge
    const badge = document.getElementById('pending-badge');
    if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }

    // Recent requests
    const recentEl = document.getElementById('recent-requests');
    if (!requests.length) {
      recentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No requests yet</h3>
          <p>Find a mentor and send your first connection request!</p>
        </div>`;
    } else {
      const statusBadge = (s) => {
        const map = { pending: 'warning', accepted: 'success', rejected: 'danger' };
        return `<span class="badge badge-${map[s] || 'muted'} badge-dot">${s}</span>`;
      };
      recentEl.innerHTML = requests.slice(0, 5).map(r => `
        <div class="request-card">
          <div class="request-card-left">
            ${avatarHtml(r.alumniId, 'sm')}
            <div class="request-card-info">
              <div class="request-card-name">${r.alumniId?.name || 'Unknown'}</div>
              <div class="request-card-sub">${r.alumniId?.company || ''} · ${formatDate(r.createdAt)}</div>
            </div>
          </div>
          ${statusBadge(r.status)}
        </div>`).join('');
    }

    // Upcoming meetings
    renderUpcomingMeetings(meetings);
  } catch (err) {
    toast.error('Failed to load dashboard: ' + err.message);
  }
}

function renderUpcomingMeetings(meetings) {
  const el = document.getElementById('upcoming-meetings');
  if (!el) return;

  const upcoming = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.selectedSlot?.date) - new Date(b.selectedSlot?.date))
    .slice(0, 3);

  if (!upcoming.length) {
    const hasPending = meetings.some(m => ['requested', 'slots_provided'].includes(m.status));
    el.innerHTML = `
      <div class="empty-state" style="padding:24px 0;">
        <div class="empty-state-icon">📅</div>
        <h3>${hasPending ? 'No scheduled meetings yet' : 'No meetings yet'}</h3>
        <p>${hasPending ? 'Select a slot from your pending meetings to schedule a session.' : 'After a mentor accepts you, request a 1-on-1 meeting!'}</p>
        <a href="/student/meetings.html" class="btn btn-primary btn-sm" style="margin-top:12px;">View Meetings</a>
      </div>`;
    return;
  }

  el.innerHTML = upcoming.map(m => {
    const mentor = m.alumniId;
    const slotDate = m.selectedSlot?.date ? new Date(m.selectedSlot.date) : null;
    return `
      <div class="meeting-card">
        <div class="meeting-card-header">
          <div style="display:flex;gap:12px;align-items:center;">
            ${avatarHtml(mentor, 'sm')}
            <div>
              <div style="font-weight:600;color:var(--text-primary);">${mentor?.name || 'Mentor'}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">${mentor?.jobRole || ''} ${mentor?.company ? '@ ' + mentor.company : ''}</div>
            </div>
          </div>
          <span class="badge status-scheduled">✅ Scheduled</span>
        </div>
        ${slotDate ? `
          <div style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:10px;">
            🗓 <strong>${slotDate.toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}</strong>
          </div>` : ''}
        <div style="display:flex;gap:8px;">
          ${m.meetingLink ? `<a href="${m.meetingLink}" target="_blank" class="btn btn-success btn-sm">🔗 Join Meeting</a>` : ''}
          <a href="/student/meetings.html" class="btn btn-ghost btn-sm">View Details</a>
        </div>
      </div>`;
  }).join('');
}

loadDashboard();
