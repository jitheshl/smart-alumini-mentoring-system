import {
  requireAuth, logout, getMyRequests, getAlumniById, requestMeeting,
  avatarHtml, formatDate, toast
} from '/js/api.js';

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

let allMentors = [];
let meetingAlumniId = null;

// Render mentor cards
function renderMentors(list) {
  const grid = document.getElementById('mentor-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon">📭</div>
      <h3>No mentors found</h3>
      <p>Try searching for a different mentor or request new ones from the Find Mentors tab.</p>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(a => `
    <div class="mentor-card" data-id="${a._id}">
      <div class="mentor-card-top">
        ${avatarHtml(a, 'lg')}
        <div class="mentor-card-info">
          <div class="mentor-card-name">${a.name}</div>
          <div class="mentor-card-role">${a.jobRole || 'Professional'}</div>
          <div class="mentor-card-company">🏢 ${a.company || 'N/A'}</div>
        </div>
        <div>
          ${a.passOutYear ? `<span class="badge badge-muted">${a.passOutYear}</span>` : ''}
        </div>
      </div>
      ${a.skills?.length ? `<div class="tags">${a.skills.slice(0,4).map(s=>`<span class="tag">${s}</span>`).join('')}${a.skills.length>4?`<span class="tag">+${a.skills.length-4}</span>`:''}</div>` : ''}
      <div class="mentor-card-actions" style="flex-wrap:wrap; margin-top:12px;">
        <button class="btn btn-ghost btn-sm view-profile-btn" data-id="${a._id}" style="flex:1;">👁 View Profile</button>
        <button class="btn btn-sm meeting-btn" data-id="${a._id}" data-name="${a.name}" style="background:var(--success-soft);color:var(--success);border:1px solid rgba(0,212,170,0.25);flex:2;">📅 Request Meeting</button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => openProfileModal(btn.dataset.id));
  });
  grid.querySelectorAll('.meeting-btn').forEach(btn => {
    btn.addEventListener('click', () => openMeetingModal(btn.dataset.id, btn.dataset.name));
  });
}

// Profile modal
async function openProfileModal(id) {
  const modal = document.getElementById('profile-modal');
  const body  = document.getElementById('modal-body');
  modal.classList.add('open');
  body.innerHTML = '<div class="flex-center" style="padding:40px 0;"><div class="spinner"></div></div>';

  try {
    const { alumni: a } = await getAlumniById(id);
    body.innerHTML = `
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:24px;">
        ${avatarHtml(a, 'xl')}
        <div style="flex:1;">
          <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:4px;">${a.name}</h2>
          <div style="color:var(--accent);font-weight:600;margin-bottom:6px;">${a.jobRole || ''} ${a.company ? `@ ${a.company}` : ''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;color:var(--text-secondary);font-size:0.83rem;">
            ${a.branch ? `<span>📚 ${a.branch}</span>` : ''}
            ${a.passOutYear ? `<span>🎓 Class of ${a.passOutYear}</span>` : ''}
            ${a.experience ? `<span>⏱ ${a.experience} yrs exp</span>` : ''}
          </div>
        </div>
      </div>
      ${a.bio ? `<div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:16px;margin-bottom:20px;font-size:0.88rem;color:var(--text-secondary);line-height:1.7;">${a.bio}</div>` : ''}
      ${a.skills?.length ? `
        <div style="margin-bottom:20px;">
          <div class="profile-section-title">🛠️ Skills</div>
          <div class="tags">${a.skills.map(s=>`<span class="tag">${s}</span>`).join('')}</div>
        </div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${a.links?.linkedin ? `<a href="${a.links.linkedin}" target="_blank" class="btn btn-secondary btn-sm">💼 LinkedIn</a>` : ''}
        ${a.links?.github ? `<a href="${a.links.github}" target="_blank" class="btn btn-secondary btn-sm">🐙 GitHub</a>` : ''}
        <button class="btn btn-sm" id="modal-meeting-btn" data-id="${a._id}" data-name="${a.name}" style="background:var(--success-soft);color:var(--success);border:1px solid rgba(0,212,170,0.25);">📅 Request Meeting</button>
        <button class="btn btn-danger btn-sm" id="modal-report-btn" data-id="${a._id}">🚩 Report</button>
      </div>`;

    document.getElementById('modal-report-btn').addEventListener('click', (e) => {
      modal.classList.remove('open');
      window.location.href = `/student/complaints.html?alumniId=${e.target.dataset.id}`;
    });
    document.getElementById('modal-meeting-btn')?.addEventListener('click', (e) => {
      modal.classList.remove('open');
      openMeetingModal(e.target.dataset.id, e.target.dataset.name);
    });
  } catch (err) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

// ── Meeting request modal ────────────────────────────────────────────────────
function openMeetingModal(id, name) {
  meetingAlumniId = id;
  document.getElementById('meeting-alumni-name').textContent = name;
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
  if (!meetingAlumniId) {
    toast.error('Mentor not selected. Please reopen the meeting request modal.');
    return;
  }
  if (!reason || reason.length < 10) {
    toast.warning('Please provide a reason (at least 10 characters).');
    return;
  }
  const btn = document.getElementById('send-meeting-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await requestMeeting({ mentorId: meetingAlumniId, alumniId: meetingAlumniId, studentId: user._id, reason });
    toast.success('Meeting request sent! 📅');
    document.getElementById('meeting-modal').classList.remove('open');
  } catch (err) {
    if ((err.message || '').toLowerCase().includes('active meeting request')) {
      toast.info('You already have an active request with this mentor. Opening Meetings…');
      setTimeout(() => { window.location.href = '/student/meetings.html'; }, 700);
      return;
    }
    toast.error(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '📅 Send Meeting Request';
  }
});

// Modal close handlers
document.getElementById('close-modal').addEventListener('click', () =>
  document.getElementById('profile-modal').classList.remove('open'));
document.getElementById('profile-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

// Search
document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = allMentors.filter(a =>
    a.name?.toLowerCase().includes(q) ||
    a.company?.toLowerCase().includes(q) ||
    a.jobRole?.toLowerCase().includes(q) ||
    a.skills?.some(s => s.toLowerCase().includes(q))
  );
  renderMentors(filtered);
});

// Load accepted requests
async function load() {
  try {
    const { requests } = await getMyRequests();
    
    // Filter requests to only include accepted ones and extract the alumni data
    allMentors = (requests || [])
      .filter(r => r.status === 'accepted' && r.alumniId)
      .map(r => r.alumniId);
      
    // Deduplicate mentors in case of multiple accepted requests (edge case)
    const uniqueIds = new Set();
    allMentors = allMentors.filter(a => {
        if (uniqueIds.has(a._id)) return false;
        uniqueIds.add(a._id);
        return true;
    });

    renderMentors(allMentors);
  } catch (err) {
    toast.error('Failed to load your mentors: ' + err.message);
    document.getElementById('mentor-grid').innerHTML =
      `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

load();
