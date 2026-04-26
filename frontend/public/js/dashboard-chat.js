import { getChatContacts, getConversation, sendChatMessage, avatarHtml, toast } from '/js/api.js';

export async function initDashboardChat(currentUser) {
  const contactsEl = document.getElementById('chat-contacts');
  const messagesEl = document.getElementById('chat-messages');
  const titleEl = document.getElementById('chat-active-name');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (!contactsEl || !messagesEl || !titleEl || !inputEl || !sendBtn) return;

  let contacts = [];
  let activeUserId = null;

  const roleLabel = (r) => r === 'admin' ? 'Admin' : r === 'alumni' ? 'Alumni' : 'Student';

  const renderMessages = (messages) => {
    if (!messages.length) {
      messagesEl.innerHTML = '<div class="empty-state" style="padding:20px 0;"><h3>No messages yet</h3><p>Start the conversation.</p></div>';
      return;
    }
    messagesEl.innerHTML = messages.map((m) => {
      const mine = String(m.senderId?._id || m.senderId) === String(currentUser._id);
      return `
        <div class="chat-msg-row ${mine ? 'mine' : 'theirs'}">
          <div class="chat-msg-bubble">
            <div class="chat-msg-meta">${mine ? 'You' : (m.senderId?.name || 'User')} • ${new Date(m.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
            <div>${m.message}</div>
          </div>
        </div>`;
    }).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const loadConversation = async () => {
    if (!activeUserId) return;
    try {
      const { messages } = await getConversation(activeUserId);
      renderMessages(messages || []);
    } catch (err) {
      toast.error('Unable to load chat: ' + err.message);
    }
  };

  const renderContacts = () => {
    if (!contacts.length) {
      contactsEl.innerHTML = '<div class="empty-state" style="padding:20px 0;"><h3>No contacts available</h3><p>Accepted mentorship links and admin accounts appear here.</p></div>';
      titleEl.textContent = 'Select a conversation';
      return;
    }
    contactsEl.innerHTML = contacts.map((c) => `
      <button class="chat-contact ${String(c._id) === String(activeUserId) ? 'active' : ''}" data-id="${c._id}">
        ${avatarHtml(c, 'sm')}
        <div class="chat-contact-meta">
          <div class="chat-contact-name">${c.name}</div>
          <div class="chat-contact-role">${roleLabel(c.role)}</div>
        </div>
      </button>
    `).join('');
    contactsEl.querySelectorAll('.chat-contact').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeUserId = btn.dataset.id;
        const selected = contacts.find((c) => String(c._id) === String(activeUserId));
        titleEl.textContent = selected ? `Chat with ${selected.name}` : 'Conversation';
        renderContacts();
        loadConversation();
      });
    });
  };

  sendBtn.addEventListener('click', async () => {
    const message = inputEl.value.trim();
    if (!activeUserId) return toast.warning('Select a contact first');
    if (!message) return toast.warning('Type a message first');
    sendBtn.disabled = true;
    try {
      await sendChatMessage({ receiverId: activeUserId, message });
      inputEl.value = '';
      await loadConversation();
    } catch (err) {
      toast.error(err.message);
    } finally {
      sendBtn.disabled = false;
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  try {
    const data = await getChatContacts();
    contacts = data.contacts || [];
    if (contacts.length) {
      activeUserId = contacts[0]._id;
      titleEl.textContent = `Chat with ${contacts[0].name}`;
    }
    renderContacts();
    await loadConversation();
  } catch (err) {
    toast.error('Failed to load contacts: ' + err.message);
    contactsEl.innerHTML = `<div class="empty-state" style="padding:20px 0;"><h3>${err.message}</h3></div>`;
  }
}
