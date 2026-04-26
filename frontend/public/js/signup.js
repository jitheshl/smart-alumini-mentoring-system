import { apiFetch, setAuth, getUser, redirectByRole, toast } from '/js/api.js';

const user = getUser();
if (user) redirectByRole(user.role);

let selectedRole = 'student';

// Role card toggle
document.querySelectorAll('input[name="role"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedRole = radio.value;
    document.getElementById('card-student').classList.toggle('selected', selectedRole === 'student');
    document.getElementById('card-alumni').classList.toggle('selected',  selectedRole === 'alumni');
    document.querySelector('.student-fields').style.display = selectedRole === 'student' ? '' : 'none';
    document.querySelector('.alumni-fields').style.display  = selectedRole === 'alumni'  ? '' : 'none';
  });
});

// Password toggle
document.getElementById('pw-toggle').addEventListener('click', function () {
  const i = document.getElementById('password');
  i.type = i.type === 'password' ? 'text' : 'password';
  this.textContent = i.type === 'password' ? '👁️' : '🙈';
});

// Alert
const showAlert = (msg, type = 'error') => {
  const el = document.getElementById('auth-alert');
  el.className = `auth-alert show ${type}`;
  el.textContent = msg;
};

// Submit
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn    = document.getElementById('signup-btn');
  const btnText = document.getElementById('btn-text');

  // Validate
  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  ['name-error','email-error','password-error'].forEach(id => document.getElementById(id).textContent = '');
  let valid = true;
  if (!name)     { document.getElementById('name-error').textContent = 'Name is required'; valid = false; }
  if (!email)    { document.getElementById('email-error').textContent = 'Email is required'; valid = false; }
  if (!password || password.length < 6) { document.getElementById('password-error').textContent = 'Password must be at least 6 characters'; valid = false; }
  if (!valid) return;

  const payload = { name, email, password, role: selectedRole };

  if (selectedRole === 'student') {
    payload.branch = document.getElementById('branch').value.trim();
    payload.year   = document.getElementById('year').value;
  } else {
    payload.company    = document.getElementById('company').value.trim();
    payload.jobRole    = document.getElementById('jobRole').value.trim();
    payload.branch     = document.getElementById('a-branch').value.trim();
    payload.passOutYear = document.getElementById('passOutYear').value || null;
  }

  btn.disabled = true;
  btnText.textContent = 'Creating Account…';

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (selectedRole === 'alumni') {
      showAlert('✅ Account created! Awaiting admin approval. You will be able to login once approved.', 'success');
    } else {
      showAlert('✅ Account created! Redirecting…', 'success');
      setAuth(data.token, data.user);
      setTimeout(() => redirectByRole(data.user.role), 1200);
    }
  } catch (err) {
    showAlert(err.message);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Create Account';
  }
});
