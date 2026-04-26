import {
  requireAuth, logout, getMyComplaints, fileComplaint, getAlumni, getMyMeetings,
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

// Message counter
document.getElementById('complaint-msg').addEventListener('input', function () {
  document.getElementById('msg-counter').textContent = `${this.value.length} / 1000`;
});

// File name display
document.getElementById('evidence-input').addEventListener('change', function () {
  document.getElementById('file-name-display').textContent =
    this.files[0] ? `📎 ${this.files[0].name}` : '';
});

// Pre-fill alumniId from URL params if coming from report button
const params = new URLSearchParams(location.search);
const preAlumniId = params.get('alumniId');

// Load alumni dropdown
async function loadAlumni() {
  try {
    const { alumni } = await getAlumni();
    const select = document.getElementById('alumni-select');
    (alumni || []).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a._id;
      opt.textContent = `${a.name} (${a.company || a.jobRole || 'Alumni'})`;
      if (preAlumniId && a._id === preAlumniId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    toast.error('Failed to load alumni list');
  }
}

// Load meetings dropdown (for linking to a complaint)
async function loadMeetingsDropdown() {
  try {
    const { meetings } = await getMyMeetings();
    const select = document.getElementById('meeting-select');
    if (!select) return;
    (meetings || []).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m._id;
      const date = m.selectedSlot?.date ? new Date(m.selectedSlot.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
      opt.textContent = `${m.alumniId?.name || 'Meeting'} — ${date || formatDate(m.createdAt)} (${m.status})`;
      select.appendChild(opt);
    });
  } catch (_) { /* non-critical */ }
}

// Submit complaint
document.getElementById('complaint-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alumniId = document.getElementById('alumni-select').value;
  const message  = document.getElementById('complaint-msg').value.trim();
  const meetingId = document.getElementById('meeting-select')?.value || '';

  if (!alumniId) { toast.warning('Please select an alumni'); return; }
  if (!message)  { toast.warning('Please describe the issue'); return; }

  const btn = document.getElementById('submit-complaint-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const fd = new FormData();
    fd.append('alumniId', alumniId);
    fd.append('message', message);
    if (meetingId) fd.append('meetingId', meetingId);
    const evFile = document.getElementById('evidence-input').files[0];
    if (evFile) fd.append('evidence', evFile);

    await fileComplaint(fd);
    toast.success('Complaint submitted. Admin has been notified.');
    document.getElementById('complaint-form').reset();
    document.getElementById('msg-counter').textContent = '0 / 1000';
    document.getElementById('file-name-display').textContent = '';
    loadComplaints();
  } catch (err) {
    toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚩 Submit Complaint';
  }
});

// Load past complaints
async function loadComplaints() {
  const container = document.getElementById('complaints-list');
  try {
    const { complaints } = await getMyComplaints();
    if (!complaints.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No complaints filed</h3>
        <p>You haven't reported any issues yet</p>
      </div>`;
      return;
    }
    const statusBadge = (s) => {
      const map = { open:'warning', warned:'danger', blocked:'danger', ignored:'muted' };
      return `<span class="badge badge-${map[s]||'muted'}">${s}</span>`;
    };
    container.innerHTML = complaints.map(c => `
      <div class="complaint-card">
        <div class="complaint-card-header">
          <div class="flex gap-2" style="align-items:center;">
            ${avatarHtml(c.alumniId, 'sm')}
            <div>
              <span class="font-semibold text-sm">${c.alumniId?.name || 'Unknown'}</span><br>
              <span class="text-xs text-muted">${formatDate(c.createdAt)}</span>
            </div>
          </div>
          ${statusBadge(c.status)}
        </div>
        <div class="complaint-card-msg">${c.message}</div>
        ${c.meetingId ? `
          <div style="margin-top:8px;padding:8px 12px;background:var(--bg-elevated);border-radius:var(--radius-md);border-left:3px solid var(--accent);font-size:0.78rem;color:var(--text-muted);">
            🔗 Linked to meeting on ${c.meetingId.createdAt ? formatDate(c.meetingId.createdAt) : 'N/A'}
            <span class="badge badge-muted" style="margin-left:6px;">${c.meetingId.status || ''}</span>
          </div>` : ''}
        ${c.evidence ? `<div class="text-xs text-muted mt-1">📎 Evidence attached</div>` : ''}
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>${err.message}</h3></div>`;
  }
}

loadAlumni();
loadMeetingsDropdown();
loadComplaints();
