import { verifyEmail, simpleResetPassword, sendPublicContactMessage } from './api.js';

const alert = document.getElementById('auth-alert');
const subtitle = document.getElementById('form-subtitle');
const mainTitle = document.getElementById('main-title');

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const contactSection = document.getElementById('contact-section');

const verifyForm = document.getElementById('verify-email-form');
const resetForm = document.getElementById('reset-password-form');
const contactForm = document.getElementById('public-contact-form');

const verifyBtn = document.getElementById('verify-btn');
const resetBtn = document.getElementById('reset-btn');
const contactBtn = document.getElementById('c-submit-btn');

let registeredEmail = '';

// Check for contact parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('contact') === 'true') {
  step1.style.display = 'none';
  contactSection.style.display = 'block';
  mainTitle.textContent = 'Contact Admin';
  subtitle.textContent = 'Tell us about your account issue';
}

// Toggles
document.getElementById('show-contact-btn').addEventListener('click', () => {
  step1.style.display = 'none';
  contactSection.style.display = 'block';
  mainTitle.textContent = 'Contact Admin';
  subtitle.textContent = 'Tell us about your account issue';
  alert.className = 'auth-alert';
});

document.getElementById('back-to-reset').addEventListener('click', () => {
  contactSection.style.display = 'none';
  step1.style.display = 'block';
  mainTitle.textContent = 'Account Recovery';
  subtitle.textContent = 'Enter your email to get started';
  alert.className = 'auth-alert';
});

// Step 1: Verify Email
verifyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();

  if (!email) {
    showAlert('Please enter your email', 'error');
    return;
  }

  setLoading(verifyBtn, true, 'Checking...');
  try {
    const data = await verifyEmail(email);
    if (data.success) {
      registeredEmail = email;
      showAlert(data.message, 'success');
      step1.style.display = 'none';
      step2.style.display = 'block';
      subtitle.textContent = `Resetting password for ${email}`;
    } else {
      showAlert(data.message, 'error');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    setLoading(verifyBtn, false, 'Verify Email');
  }
});

// Step 2: Reset Password
resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword.length < 6) {
    showAlert('Password must be at least 6 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }

  setLoading(resetBtn, true, 'Updating...');
  try {
    const data = await simpleResetPassword({
      email: registeredEmail,
      newPassword,
      confirmPassword
    });
    if (data.success) {
      showSuccess('Success!', 'Your password has been updated. You can now sign in.');
    } else {
      showAlert(data.message, 'error');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    setLoading(resetBtn, false, 'Update Password');
  }
});

// Step 4: Public Contact Form
contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name:    document.getElementById('c-name').value.trim(),
    email:   document.getElementById('c-email').value.trim(),
    subject: document.getElementById('c-subject').value.trim(),
    message: document.getElementById('c-message').value.trim()
  };

  setLoading(contactBtn, true, 'Sending...');
  try {
    const data = await sendPublicContactMessage(payload);
    if (data.success) {
      showSuccess('Message Sent!', 'Your help request has been sent to admin. We will get back to you via email.', '📬');
    } else {
      showAlert(data.message, 'error');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    setLoading(contactBtn, false, 'Send Help Request');
  }
});

function showAlert(msg, type) {
  alert.textContent = msg;
  alert.className = `auth-alert show ${type}`;
}

function showSuccess(title, msg, icon = '✅') {
  step1.style.display = 'none';
  step2.style.display = 'none';
  contactSection.style.display = 'none';
  step3.style.display = 'block';
  subtitle.style.display = 'none';
  alert.style.display = 'none';
  document.getElementById('auth-footer').style.display = 'none';
  
  document.getElementById('success-title').textContent = title;
  document.getElementById('success-msg').textContent = msg;
  document.getElementById('success-icon').textContent = icon;
}

function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.textContent = loading ? text : btn.dataset.originalText || btn.textContent;
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
}
