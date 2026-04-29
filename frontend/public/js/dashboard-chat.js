import { getChatContacts, getConversation, sendChatMessage, editChatMessage, deleteChatMessage, avatarHtml, toast, getToken } from '/js/api.js';

export async function initDashboardChat(currentUser) {
  const contactsEl = document.getElementById('chat-contacts');
  const messagesEl = document.getElementById('chat-messages');
  const titleEl = document.getElementById('chat-active-name');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (!contactsEl || !messagesEl || !titleEl || !inputEl || !sendBtn) return;

  let contacts = [];
  let activeUserId = null;
  let editingMsgId = null; // Track if we're editing a message

  // --- Socket.IO real-time connection ---
  let socket = null;
  try {
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
      const senderId = String(msg.senderId?._id || msg.senderId);
      if (senderId === String(activeUserId)) {
        appendMessage(msg);
      } else {
        const senderName = msg.senderId?.name || 'Someone';
        toast.info(`💬 New message from ${senderName}`);
      }
    });

    socket.on('message_edited', (data) => {
      const el = messagesEl.querySelector(`[data-msg-id="${data._id}"]`);
      if (el) {
        el.querySelector('.chat-msg-text').textContent = data.message;
        let editedTag = el.querySelector('.chat-edited-tag');
        if (!editedTag) {
          editedTag = document.createElement('span');
          editedTag.className = 'chat-edited-tag';
          editedTag.textContent = '(edited)';
          el.querySelector('.chat-msg-meta').appendChild(editedTag);
        }
      }
    });

    socket.on('message_deleted', (data) => {
      const el = messagesEl.querySelector(`[data-msg-id="${data._id}"]`);
      if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.9)';
        setTimeout(() => el.remove(), 300);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });
  } catch (err) {
    console.warn('Socket.IO not available, falling back to polling:', err.message);
  }

  const roleLabel = (r) => r === 'admin' ? 'Admin' : r === 'alumni' ? 'Alumni' : 'Student';
  const isAdmin = currentUser.role === 'admin';
  const escapeHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Build HTML for a single message
  const buildMsgHtml = (m) => {
    const mine = String(m.senderId?._id || m.senderId) === String(currentUser._id);
    const msgId = m._id;
    const edited = m.isEdited ? '<span class="chat-edited-tag">(edited)</span>' : '';
    const timeStr = new Date(m.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    // Show actions: edit for own messages, delete for own messages or admin
    let actions = '';
    if (mine || isAdmin) {
      actions = `<div class="chat-msg-actions">`;
      if (mine) {
        actions += `<button class="chat-action-btn chat-edit-btn" data-id="${msgId}" title="Edit">✏️</button>`;
      }
      actions += `<button class="chat-action-btn chat-delete-btn" data-id="${msgId}" title="Delete">🗑️</button>`;
      actions += `</div>`;
    }

    return `
      <div class="chat-msg-row ${mine ? 'mine' : 'theirs'}" data-msg-id="${msgId}">
        <div class="chat-msg-bubble">
          <div class="chat-msg-meta">${mine ? 'You' : (m.senderId?.name || 'User')} • ${timeStr} ${edited}</div>
          <div class="chat-msg-text">${escapeHtml(m.message)}</div>
          ${actions}
        </div>
      </div>`;
  };

  // Attach edit/delete event listeners to messages in the container
  const attachMsgActions = (container) => {
    container.querySelectorAll('.chat-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.id;
        const row = messagesEl.querySelector(`[data-msg-id="${msgId}"]`);
        const textEl = row?.querySelector('.chat-msg-text');
        if (!textEl) return;

        editingMsgId = msgId;
        inputEl.value = textEl.textContent;
        inputEl.focus();
        sendBtn.textContent = '✅ Save';
        sendBtn.classList.add('editing');
      });
    });

    container.querySelectorAll('.chat-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.id;
        if (!confirm('Delete this message?')) return;

        try {
          await deleteChatMessage(msgId);
          const row = messagesEl.querySelector(`[data-msg-id="${msgId}"]`);
          if (row) {
            row.style.transition = 'opacity 0.3s, transform 0.3s';
            row.style.opacity = '0';
            row.style.transform = 'scale(0.9)';
            setTimeout(() => row.remove(), 300);
          }
          toast.success('Message deleted');
        } catch (err) {
          toast.error(err.message);
        }
      });
    });
  };

  // Append a single message to the chat window (used for real-time)
  const appendMessage = (m) => {
    const emptyState = messagesEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const div = document.createElement('div');
    div.innerHTML = buildMsgHtml(m);
    const row = div.firstElementChild;
    messagesEl.appendChild(row);
    attachMsgActions(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderMessages = (messages) => {
    if (!messages.length) {
      messagesEl.innerHTML = '<div class="empty-state" style="padding:20px 0;"><h3>No messages yet</h3><p>Start the conversation.</p></div>';
      return;
    }
    messagesEl.innerHTML = messages.map(m => buildMsgHtml(m)).join('');
    attachMsgActions(messagesEl);
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
        cancelEdit();
        renderContacts();
        loadConversation();
      });
    });
  };

  // Cancel editing mode
  const cancelEdit = () => {
    editingMsgId = null;
    inputEl.value = '';
    sendBtn.textContent = 'Send';
    sendBtn.classList.remove('editing');
  };

  // Handle send or edit
  const handleSendOrEdit = async () => {
    const message = inputEl.value.trim();
    if (!activeUserId) return toast.warning('Select a contact first');
    if (!message) return toast.warning('Type a message first');

    sendBtn.disabled = true;
    try {
      if (editingMsgId) {
        // EDIT mode
        await editChatMessage(editingMsgId, message);
        const row = messagesEl.querySelector(`[data-msg-id="${editingMsgId}"]`);
        if (row) {
          row.querySelector('.chat-msg-text').textContent = message;
          let editedTag = row.querySelector('.chat-edited-tag');
          if (!editedTag) {
            editedTag = document.createElement('span');
            editedTag.className = 'chat-edited-tag';
            editedTag.textContent = '(edited)';
            row.querySelector('.chat-msg-meta').appendChild(editedTag);
          }
        }
        toast.success('Message updated');
        cancelEdit();
      } else {
        // SEND mode
        const { chat } = await sendChatMessage({ receiverId: activeUserId, message });
        inputEl.value = '';
        appendMessage({
          _id: chat._id,
          senderId: { _id: currentUser._id, name: currentUser.name },
          message: chat.message,
          isEdited: false,
          timestamp: chat.timestamp || new Date().toISOString()
        });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  };

  sendBtn.addEventListener('click', handleSendOrEdit);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editingMsgId) {
      cancelEdit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendOrEdit();
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
