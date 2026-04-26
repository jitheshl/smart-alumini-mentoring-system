import {
  requireAuth, logout, getIncomingMeetings, submitSlots, completeMeeting, cancelMeeting,
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

let activeMeetingId = null;
let slotCount = 1;

const statusLabel = {
  requested:     '⏳ Pending',
  slots_provided:'📅 Slots Sent',
  scheduled:     '✅ Scheduled',
  completed:     '🎉 Completed',
  cancelled:     '❌ Cancelled'
};

// ── Render meeting cards ─────────────────────────────────────────────────────
function renderMeetings(meetings) {
  const container = document.getElementById('meetings-list');
  if (!meetings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <h3>No meeting requests yet</h3>
        <p>When a student requests a 1-on-1 session with you, it will appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = meetings.map(m => {
    const student = m.studentId;
    const statusCls = `status-${m.status}`;
    const label = statusLabel[m.status] || m.status;

    let actionHtml = '';
    if (m.status === 'requested') {
      actionHtml = `<button class="btn btn-primary btn-sm provide-slots-btn" data-id="${m._id}">📅 Provide Available Slots</button>`;
    } else if (m.status === 'slots_provided') {
      actionHtml = `<span class="text-xs text-muted">✅ Slots sent — waiting for student to confirm…</span>`;
    } else if (m.status === 'scheduled') {
      actionHtml = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <div style="font-size:0.82rem;color:var(--text-secondary);">
            🗓 <strong>${new Date(m.selectedSlot?.date).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}</strong>
            ${m.selectedSlot?.label ? `<span style="color:var(--text-muted)"> · ${m.selectedSlot.label}</span>` : ''}
          </div>
          ${m.meetingLink ? `<a href="${m.meetingLink}" target="_blank" class="btn btn-success btn-sm">🔗 Join</a>` : ''}
          <button class="btn btn-secondary btn-sm mark-complete-btn" data-id="${m._id}">✔ Mark Complete</button>
        </div>`;
    } else if (m.status === 'completed') {
      actionHtml = `<span class="badge badge-muted">Session completed</span>`;
    }

    const slotsHtml = m.proposedSlots?.length && m.status === 'slots_provided' ? `
      <div style="margin-top:8px;margin-bottom:12px;">
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;">Proposed Slots</div>
        <div class="slots-grid">
          ${m.proposedSlots.map(s => `
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:10px;font-size:0.8rem;color:var(--text-secondary);text-align:center;">
              ${new Date(s.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}<br>
              <strong>${new Date(s.date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</strong>
            </div>`).join('')}
        </div>
      </div>` : '';

    const canCancel = ['requested', 'slots_provided'].includes(m.status);

    return `
      <div class="meeting-card">
        <div class="meeting-card-header">
          <div style="display:flex;gap:14px;align-items:center;">
            ${avatarHtml(student, 'md')}
            <div>
              <div style="font-weight:700;font-size:1rem;color:var(--text-primary);">${student?.name || 'Unknown Student'}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">
                ${student?.branch ? '📚 ' + student.branch : ''} ${student?.year ? '· ' + student.year : ''}
              </div>
            </div>
          </div>
          <span class="badge ${statusCls}">${label}</span>
        </div>
        <div class="meeting-card-meta">
          <span>📅 Requested ${formatDate(m.createdAt)}</span>
        </div>
        <div class="meeting-reason" style="border-left-color:var(--success);">"${m.reason}"</div>
        ${slotsHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>${actionHtml}</div>
          ${canCancel ? `<button class="btn btn-ghost btn-sm cancel-btn" data-id="${m._id}" style="color:var(--danger);">✕ Cancel</button>` : ''}
        </div>
      </div>`;
  }).join('');

  // Bind provide-slots buttons
  container.querySelectorAll('.provide-slots-btn').forEach(btn => {
    btn.addEventListener('click', () => openSlotsModal(btn.dataset.id));
  });

  // Bind mark complete
  container.querySelectorAll('.mark-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => doComplete(btn.dataset.id, btn));
  });

  // Bind cancel
  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => doCancel(btn.dataset.id, btn));
  });
}

// ── Slots modal ──────────────────────────────────────────────────────────────
function openSlotsModal(meetingId) {
  activeMeetingId = meetingId;
  slotCount = 1;
  document.getElementById('meeting-link-input').value = '';
  buildSlotsForm();
  document.getElementById('slots-modal').classList.add('open');
}

function buildSlotsForm() {
  const form = document.getElementById('slots-form');
  form.innerHTML = Array.from({ length: slotCount }, (_, i) => `
    <div class="slot-form-row">
      <div class="slot-num">${i + 1}</div>
      <div class="slot-inputs">
        <div>
          <label class="form-label" style="font-size:0.75rem;margin-bottom:3px;">Date &amp; Time</label>
          <input class="form-control slot-datetime" type="datetime-local" id="slot-dt-${i}" style="font-size:0.85rem;">
        </div>
        <div>
          <label class="form-label" style="font-size:0.75rem;margin-bottom:3px;">Label (optional)</label>
          <input class="form-control slot-label" type="text" id="slot-lbl-${i}" placeholder="e.g. 10am IST" style="font-size:0.85rem;">
        </div>
      </div>
    </div>`).join('');
}

document.getElementById('add-slot-btn').addEventListener('click', () => {
  if (slotCount >= 3) { toast.warning('Maximum 3 slots allowed'); return; }
  slotCount++;
  buildSlotsForm();
});

document.getElementById('close-slots-modal').addEventListener('click', () =>
  document.getElementById('slots-modal').classList.remove('open'));
document.getElementById('cancel-slots-modal').addEventListener('click', () =>
  document.getElementById('slots-modal').classList.remove('open'));
document.getElementById('slots-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('submit-slots-btn').addEventListener('click', async () => {
  const slots = [];
  for (let i = 0; i < slotCount; i++) {
    const dt = document.getElementById(`slot-dt-${i}`)?.value;
    const lbl = document.getElementById(`slot-lbl-${i}`)?.value?.trim() || '';
    if (!dt) { toast.warning(`Please fill in slot ${i + 1}`); return; }
    slots.push({ date: new Date(dt).toISOString(), label: lbl });
  }
  const meetingLink = document.getElementById('meeting-link-input').value.trim();

  const btn = document.getElementById('submit-slots-btn');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await submitSlots(activeMeetingId, { slots, meetingLink });
    toast.success('Available slots sent to student! 📅');
    document.getElementById('slots-modal').classList.remove('open');
    load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '📤 Send Slots to Student';
  }
});

// ── Complete / Cancel ────────────────────────────────────────────────────────
async function doComplete(id, btn) {
  if (!confirm('Mark this meeting as completed?')) return;
  btn.disabled = true;
  try {
    await completeMeeting(id);
    toast.success('Meeting marked as completed');
    load();
  } catch (err) {
    toast.error(err.message);
    btn.disabled = false;
  }
}

async function doCancel(id, btn) {
  if (!confirm('Cancel this meeting?')) return;
  btn.disabled = true;
  try {
    await cancelMeeting(id);
    toast.info('Meeting cancelled');
    load();
  } catch (err) {
    toast.error(err.message);
    btn.disabled = false;
  }
}

// ── Load ─────────────────────────────────────────────────────────────────────
async function load() {
  try {
    const { meetings } = await getIncomingMeetings();
    renderMeetings(meetings || []);
  } catch (err) {
    toast.error('Failed to load meetings: ' + err.message);
    document.getElementById('meetings-list').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

load();
