import { getChatContacts, getConversation, sendChatMessage, avatarHtml, toast, getToken } from '/js/api.js';

export async function initDashboardChat(currentUser) {
  const contactsEl = document.getElementById('chat-contacts');
  const messagesEl = document.getElementById('chat-messages');
  const titleEl = document.getElementById('chat-active-name');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (!contactsEl || !messagesEl || !titleEl || !inputEl || !sendBtn) return;

  let contacts = [];
  let activeUserId = null;

  // --- Socket.IO real-time connection ---
  let socket = null;
  try {
    // Load Socket.IO client from CDN (served by the server)
    if (typeof io === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    socket = io({ auth: { token: getToken() } });

    socket.on('connect', () => {
      console.log('💬 Chat connected in real-time');
    });

    socket.on('new_message', (msg) => {
      // If this message is from the person we're currently chatting with, append it live
      const senderId = String(msg.senderId?._id || msg.senderId);
      if (senderId === String(activeUserId)) {
        appendMessage(msg);
      } else {
        // Show a toast notification for messages from other contacts
        const senderName = msg.senderId?.name || 'Someone';
        toast.info(`💬 New message from ${senderName}`);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });
  } catch (err) {
    console.warn('Socket.IO not available, falling back to polling:', err.message);
  }

  const roleLabel = (r) => r === 'admin' ? 'Admin' : r === 'alumni' ? 'Alumni' : 'Student';

  // Append a single message to the chat window (used for real-time)
  const appendMessage = (m) => {
    // Remove empty state if present
    const emptyState = messagesEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const mine = String(m.senderId?._id || m.senderId) === String(currentUser._id);
    const div = document.createElement('div');
    div.className = `chat-msg-row ${mine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
      <div class="chat-msg-bubble">
        <div class="chat-msg-meta">${mine ? 'You' : (m.senderId?.name || 'User')} • ${new Date(m.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div>${m.message}</div>
      </div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

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
      const { chat } = await sendChatMessage({ receiverId: activeUserId, message });
      inputEl.value = '';
      // Append own message immediately (no need to reload everything)
      appendMessage({
        _id: chat._id,
        senderId: { _id: currentUser._id, name: currentUser.name },
        message: chat.message,
        timestamp: chat.timestamp || new Date().toISOString()
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
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
