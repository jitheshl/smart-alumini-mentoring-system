import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../database/models/User.js';

// ─── Email Transporter ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.'
      });
    }

    // Generate a secure random token
    const rawToken    = crypto.randomBytes(32).toString('hex');
    // Store a hashed version so raw token can't be retrieved from DB
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetToken       = tokenHash;
    user.resetTokenExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    const baseUrl   = process.env.BASE_URL || 'http://localhost:5000';
    const resetLink = `${baseUrl}/reset-password.html?token=${rawToken}`;

    // ── Log to console for dev/testing ────────────────────────────────────────
    console.log('\n🔑 PASSWORD RESET LINK (dev):');
    console.log(resetLink);
    console.log('Expires at:', tokenExpiry.toLocaleString());
    console.log('─'.repeat(60));

    // ── Send email if SMTP is configured ──────────────────────────────────────
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"AlumniConnect" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: '🔑 Password Reset Request — AlumniConnect',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#16161f;color:#f0f0f5;border-radius:12px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#6c63ff,#4dabf7);padding:32px 24px;text-align:center;">
                <div style="font-size:2.5rem;">🎓</div>
                <h1 style="color:#fff;margin:8px 0 0;font-size:1.5rem;">AlumniConnect</h1>
              </div>
              <div style="padding:32px 24px;">
                <h2 style="color:#f0f0f5;margin-bottom:8px;">Password Reset Request</h2>
                <p style="color:#a0a0b5;margin-bottom:24px;">Hi <strong style="color:#f0f0f5;">${user.name}</strong>, we received a request to reset your password. Click the button below to set a new password. This link expires in <strong style="color:#ffa94d;">15 minutes</strong>.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#6c63ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem;">Reset My Password</a>
                </div>
                <p style="color:#606075;font-size:0.82rem;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
                <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.07);">
                  <p style="color:#606075;font-size:0.75rem;">Or copy this link: <a href="${resetLink}" style="color:#6c63ff;word-break:break-all;">${resetLink}</a></p>
                </div>
              </div>
            </div>
          `
        });
      } catch (mailErr) {
        console.warn('⚠️  Email send failed (check SMTP config):', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/verify-email (Simple Flow) ────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    res.json({ success: true, message: 'Email verified. You can now set a new password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/simple-reset (Simple Flow) ───────────────────────────────
export const simpleResetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ success: false, message: 'Email and new password are required' });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken:       tokenHash,
      resetTokenExpiry: { $gt: Date.now() }   // must not be expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new one.'
      });
    }

    // Update password — pre-save hook will hash it
    user.password         = newPassword;
    user.resetToken       = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful! You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
