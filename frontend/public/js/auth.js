import { login, setAuth, getUser, redirectByRole, toast } from '/js/api.js';

// If already logged in, redirect
const user = getUser();
if (user) redirectByRole(user.role);

// Role tab switching
let selectedRole = 'student';
document.querySelectorAll('.role-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
  });
});

// Password toggle
document.getElementById('pw-toggle').addEventListener('click', function () {
  const input = document.getElementById('password');
  input.type = input.type === 'password' ? 'text' : 'password';
  this.textContent = input.type === 'password' ? '👁️' : '🙈';
});

// Show alert
const showAlert = (msg, type = 'error') => {
  const el = document.getElementById('auth-alert');
  el.className = `auth-alert show ${type}`;
  el.textContent = msg;
};

// Form submit
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('login-btn');
  const btnText  = document.getElementById('btn-text');

  // Clear errors
  document.getElementById('email-error').textContent = '';
  document.getElementById('password-error').textContent = '';

  // Validate
  let valid = true;
  if (!email) {
    document.getElementById('email-error').textContent = 'Email is required';
    valid = false;
  }
  if (!password) {
    document.getElementById('password-error').textContent = 'Password is required';
    valid = false;
  }
  if (!valid) return;

  btn.disabled = true;
  btnText.textContent = 'Signing in…';

  try {
    const data = await login({ email, password });
    if (data.user.role !== selectedRole) {
      showAlert(`This account is registered as "${data.user.role}", not "${selectedRole}". Redirecting…`, 'error');
      setTimeout(() => { setAuth(data.token, data.user); redirectByRole(data.user.role); }, 1500);
      return;
    }
    setAuth(data.token, data.user);
    toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
    setTimeout(() => redirectByRole(data.user.role), 600);
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false;
    btnText.textContent = 'Sign In';
  }
});
