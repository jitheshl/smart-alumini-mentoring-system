import { requireAuth, logout, avatarHtml, formatDate, toast, sendContactMessage, getMyContactMessages } from './api.js';

const user = requireAuth(['student', 'alumni']);
if (!user) throw new Error('Unauthorized');

// Sidebar logic
document.getElementById('sb-name').textContent = user.name;
document.getElementById('sb-avatar').innerHTML = avatarHtml(user, 'sm');
document.getElementById('logout-btn').addEventListener('click', logout);

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
}

// Contact Form logic
const contactForm = document.getElementById('contact-form');
const messagesList = document.getElementById('previous-messages');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!subject || !message) {
      toast.error('Subject and message are required');
      return;
    }

    try {
      const data = await sendContactMessage({ subject, message });
      if (data.success) {
        toast.success('Your message has been sent to admin');
        contactForm.reset();
        loadMessages();
      }
    } catch (err) {
      toast.error(err.message);
    }
  });
}

async function loadMessages() {
  if (!messagesList) return;
  messagesList.innerHTML = '<div class="flex-center" style="padding:20px;"><div class="spinner"></div></div>';
  try {
    const { messages } = await getMyContactMessages();
    if (!messages.length) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No messages yet</h3>
          <p>Send your first message to admin using the form above.</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = messages.map(m => `
      <div class="card mb-4">
        <div class="card-header flex-between">
          <h4 style="margin:0;">${m.subject}</h4>
          <span class="badge badge-${m.status === 'pending' ? 'warning' : 'success'} badge-dot">${m.status}</span>
        </div>
        <div class="card-body">
          <p style="white-space: pre-wrap;">${m.message}</p>
          <div class="text-xs text-muted mt-2">Sent on ${formatDate(m.createdAt)}</div>
          ${m.adminReply ? `
            <div class="mt-4 p-3 bg-elevated border-left-accent" style="border-left: 3px solid var(--accent); border-radius: var(--radius-sm);">
              <div class="text-xs font-semibold text-accent mb-1">ADMIN REPLY:</div>
              <p style="margin:0; font-size:0.88rem;">${m.adminReply}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    toast.error('Failed to load messages: ' + err.message);
  }
}

loadMessages();
