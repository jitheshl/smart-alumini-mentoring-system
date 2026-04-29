/* ============================================
   public/js/api.js — Central Fetch Wrapper
   ============================================ */

const BASE = '/api';

export const getToken = () => sessionStorage.getItem('token');
export const getUser  = () => JSON.parse(sessionStorage.getItem('user') || 'null');

export const setAuth = (token, user) => {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

// Core fetch with auto JWT header injection
export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
};

// Auth helpers
export const login    = (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const getMe    = ()     => apiFetch('/auth/me');

// User helpers
export const getProfile    = ()       => apiFetch('/users/profile');
export const updateProfile = (body)   => apiFetch('/users/profile', { method: 'PUT', body });  // FormData
export const getAlumni     = (q = '') => apiFetch(`/users/alumni${q ? `?search=${q}` : ''}`);
export const getAlumniById = (id)     => apiFetch(`/users/alumni/${id}`);

// Jobs
export const getJobs   = ()   => apiFetch('/jobs');
export const createJob = (b)  => apiFetch('/jobs', { method: 'POST', body: JSON.stringify(b) });
export const deleteJob = (id) => apiFetch(`/jobs/${id}`, { method: 'DELETE' });
export const getMyJobs = ()   => apiFetch('/jobs/my');

// Mentorship
export const sendRequest       = (b)    => apiFetch('/mentorship/request', { method: 'POST', body: JSON.stringify(b) });
export const getMyRequests     = ()     => apiFetch('/mentorship/my-requests');
export const getIncoming       = ()     => apiFetch('/mentorship/incoming');
export const respondToRequest  = (id,s) => apiFetch(`/mentorship/${id}/respond`, { method: 'PUT', body: JSON.stringify({ status: s }) });

// Complaints
export const fileComplaint    = (body) => apiFetch('/complaints', { method: 'POST', body });  // FormData
export const getMyComplaints  = ()     => apiFetch('/complaints/my');

// Admin
export const adminGetAnalytics    = ()       => apiFetch('/admin/analytics');
export const adminGetPending      = ()       => apiFetch('/admin/pending-alumni');
export const adminApprove         = (id)     => apiFetch(`/admin/alumni/${id}/approve`, { method: 'PUT' });
export const adminBlockUser       = (id)     => apiFetch(`/admin/users/${id}/block`, { method: 'PUT' });
export const adminUnblockUser     = (id)     => apiFetch(`/admin/users/${id}/unblock`, { method: 'PUT' });
export const adminGetComplaints   = ()       => apiFetch('/admin/complaints');
export const adminComplaintAction = (id, a)  => apiFetch(`/admin/complaints/${id}/action`, { method: 'PUT', body: JSON.stringify({ action: a }) });
export const adminGetUsers        = ()       => apiFetch('/admin/users');
export const adminGetJobs         = ()       => apiFetch('/admin/jobs');
export const adminGetMeetings     = ()       => apiFetch('/admin/meetings');

// Meetings
export const requestMeeting      = (b)       => apiFetch('/meetings/request', { method: 'POST', body: JSON.stringify(b) });
export const getMyMeetings       = ()        => apiFetch('/meetings/my');
export const getIncomingMeetings = ()        => apiFetch('/meetings/incoming');
export const submitSlots         = (id, b)   => apiFetch(`/meetings/${id}/slots`,    { method: 'PUT', body: JSON.stringify(b) });
export const selectSlot          = (id, b)   => apiFetch(`/meetings/${id}/select`,   { method: 'PUT', body: JSON.stringify(b) });
export const completeMeeting     = (id)      => apiFetch(`/meetings/${id}/complete`, { method: 'PUT' });
export const cancelMeeting       = (id)      => apiFetch(`/meetings/${id}/cancel`,   { method: 'PUT' });

// Chat
export const getChatContacts      = ()         => apiFetch('/chat/contacts');
export const getConversation      = (userId)   => apiFetch(`/chat/conversation/${userId}`);
export const sendChatMessage      = (body)     => apiFetch('/chat/send', { method: 'POST', body: JSON.stringify(body) });

// Toast notification system
export const toast = (() => {
  let container = null;
  const getContainer = () => {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  };
  const show = (msg, type = 'info', duration = 3500) => {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-msg">${msg}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    getContainer().appendChild(el);
    setTimeout(() => el.remove(), duration);
  };
  return {
    success: (m, d) => show(m, 'success', d),
    error: (m, d)   => show(m, 'error', d),
    info: (m, d)    => show(m, 'info', d),
    warning: (m, d) => show(m, 'warning', d),
  };
})();

// Redirect guard: if not logged in, go to login
export const requireAuth = (allowedRoles = []) => {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { window.location.href = '/'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    redirectByRole(user.role);
    return null;
  }
  return user;
};

export const redirectByRole = (role) => {
  const map = {
    student: '/student/dashboard.html',
    alumni:  '/alumni/dashboard.html',
    admin:   '/admin/dashboard.html'
  };
  window.location.href = map[role] || '/';
};

// Logout
export const logout = () => {
  clearAuth();
  window.location.href = '/';
};

// Format date
export const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Avatar initials fallback
export const avatarHtml = (user, size = 'md') =>
  user?.profilePhoto
    ? `<img class="avatar avatar-${size}" src="${user.profilePhoto}" alt="${user.name}" onerror="this.outerHTML=initialsAvatar('${user.name}','${size}')">`
    : `<div class="avatar-placeholder avatar-${size}" style="font-size:${size==='xxl'?'2.2rem':size==='xl'?'1.8rem':size==='lg'?'1.4rem':size==='md'?'1.1rem':'0.85rem'}">${(user?.name||'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>`;

export const initialsAvatar = (name, size) =>
  `<div class="avatar-placeholder avatar-${size}">${(name||'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>`;
