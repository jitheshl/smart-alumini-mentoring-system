import {
  requireAuth, logout, getMyMeetings, selectSlot, cancelMeeting,
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

let activeMeetingId = null;
let selectedSlotIndex = null;

// ── Status label map ─────────────────────────────────────────────────────────
const statusLabel = {
  requested:     '⏳ Awaiting Slots',
  slots_provided:'📅 Slots Available',
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
        <h3>No meetings yet</h3>
        <p>After your mentor accepts your request, you can schedule a 1-on-1 meeting.</p>
      </div>`;
    return;
  }

  container.innerHTML = meetings.map(m => {
    const mentor = m.alumniId;
    const statusCls = `status-${m.status}`;
    const label = statusLabel[m.status] || m.status;

    let actionHtml = '';
    if (m.status === 'slots_provided') {
      actionHtml = `<button class="btn btn-primary btn-sm select-slot-btn" data-id="${m._id}">📅 Select a Slot</button>`;
    } else if (m.status === 'scheduled') {
      actionHtml = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <div style="font-size:0.82rem;color:var(--text-secondary);">
            🗓 <strong>${new Date(m.selectedSlot?.date).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}</strong>
            ${m.selectedSlot?.label ? `<span style="color:var(--text-muted)"> · ${m.selectedSlot.label}</span>` : ''}
          </div>
          ${m.meetingLink ? `<a href="${m.meetingLink}" target="_blank" class="btn btn-success btn-sm">🔗 Join Meeting</a>` : ''}
        </div>`;
    } else if (m.status === 'requested') {
      actionHtml = `<span class="text-xs text-muted">Waiting for your mentor to propose available slots…</span>`;
    } else if (m.status === 'completed') {
      actionHtml = `<span class="badge badge-muted">Session completed</span>`;
    }

    const canCancel = ['requested', 'slots_provided'].includes(m.status);

    return `
      <div class="meeting-card">
        <div class="meeting-card-header">
          <div style="display:flex;gap:14px;align-items:center;">
            ${avatarHtml(mentor, 'md')}
            <div>
              <div style="font-weight:700;font-size:1rem;color:var(--text-primary);">${mentor?.name || 'Unknown Mentor'}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">
                ${mentor?.jobRole || ''} ${mentor?.company ? '@ ' + mentor.company : ''}
              </div>
            </div>
          </div>
          <span class="badge ${statusCls}">${label}</span>
        </div>
        <div class="meeting-card-meta">
          <span>📅 Requested ${formatDate(m.createdAt)}</span>
        </div>
        <div class="meeting-reason">"${m.reason}"</div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>${actionHtml}</div>
          ${canCancel ? `<button class="btn btn-ghost btn-sm cancel-btn" data-id="${m._id}" style="color:var(--danger);">✕ Cancel</button>` : ''}
        </div>
      </div>`;
  }).join('');

  // Bind select slot buttons
  container.querySelectorAll('.select-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => openSlotModal(btn.dataset.id, meetings));
  });

  // Bind cancel buttons
  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => doCancel(btn.dataset.id, btn));
  });
}

// ── Slot selection modal ─────────────────────────────────────────────────────
function openSlotModal(meetingId, meetings) {
  activeMeetingId = meetingId;
  selectedSlotIndex = null;
  const meeting = meetings.find(m => m._id === meetingId);
  const slots = meeting?.proposedSlots || [];

  document.getElementById('slot-cards').innerHTML = slots.map((s, i) => `
    <div class="slot-card" data-index="${i}" tabindex="0">
      <div class="slot-card-date">${new Date(s.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
      <div class="slot-card-time">${new Date(s.date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
      ${s.label ? `<div class="slot-card-label">${s.label}</div>` : ''}
    </div>`).join('');

  document.querySelectorAll('#slot-cards .slot-card').forEach(card => {
    const select = () => {
      document.querySelectorAll('#slot-cards .slot-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedSlotIndex = +card.dataset.index;
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => e.key === 'Enter' && select());
  });

  document.getElementById('slot-modal').classList.add('open');
}

document.getElementById('close-slot-modal').addEventListener('click', () =>
  document.getElementById('slot-modal').classList.remove('open'));
document.getElementById('cancel-slot-modal').addEventListener('click', () =>
  document.getElementById('slot-modal').classList.remove('open'));
document.getElementById('slot-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('confirm-slot-btn').addEventListener('click', async () => {
  if (selectedSlotIndex === null) { toast.warning('Please select a slot first'); return; }
  const btn = document.getElementById('confirm-slot-btn');
  btn.disabled = true; btn.textContent = 'Confirming…';
  try {
    await selectSlot(activeMeetingId, { slotIndex: selectedSlotIndex });
    toast.success('Meeting slot confirmed! ✅');
    document.getElementById('slot-modal').classList.remove('open');
    load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '✅ Confirm Slot';
  }
});

// ── Cancel meeting ───────────────────────────────────────────────────────────
async function doCancel(id, btn) {
  if (!confirm('Cancel this meeting request?')) return;
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
    const { meetings } = await getMyMeetings();
    renderMeetings(meetings || []);
  } catch (err) {
    toast.error('Failed to load meetings: ' + err.message);
    document.getElementById('meetings-list').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>${err.message}</h3></div>`;
  }
}

load();
