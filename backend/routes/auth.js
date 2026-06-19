const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, run } = require('../db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

const SALT_ROUNDS = process.env.NODE_ENV === 'production' ? 12 : 10;
const CODE_TTL_MS = 10 * 60 * 1000;

const router = express.Router();

// In-memory verification code stores
const signupCodes = new Map();
const resetCodes  = new Map();

function generate8DigitCode() {
  return crypto.randomInt(10000000, 100000000).toString();
}

function saveCode(store, email, code) {
  store.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

function isValidCode(store, email, submittedCode) {
  const key = email.toLowerCase();
  const record = store.get(key);

  if (!record || record.expiresAt < Date.now()) {
    store.delete(key);
    return false;
  }

  if (record.code.toString() !== submittedCode.toString()) {
    return false;
  }

  return true;
}

function deleteCode(store, email) {
  store.delete(email.toLowerCase());
}

// ── POST /auth/send-signup-code ──────────────────────────────────────────────
router.post('/send-signup-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    const code = generate8DigitCode();
    saveCode(signupCodes, email, code);

    const emailResult = await sendEmail({
      to: email,
      subject: 'GeoPhoto - Confirm Your Email',
      text: `Hello,\n\nYour 8-digit verification code is: ${code}\n\nUse this code to complete your signup process.`,
    });

    res.json({ 
      message: 'Verification code sent!', 
      previewUrl: emailResult.previewUrl || null 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// ── POST /auth/send-reset-code ────────────────────────────────────────────────
router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const rows = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    const code = generate8DigitCode();
    saveCode(resetCodes, email, code);

    const emailResult = await sendEmail({
      to: email,
      subject: 'GeoPhoto - Reset Your Password',
      text: `Hello,\n\nYour password reset code is: ${code}\n\nUse this code to choose a new password.`,
    });

    res.json({ 
      message: 'Reset code sent!', 
      previewUrl: emailResult.previewUrl || null 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// ── POST /auth/signup ────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, username, code } = req.body;
    if (!email || !password || !code) {
      return res.status(400).json({ error: 'Email, password, and code are required' });
    }

    // Verify code on backend
    if (!isValidCode(signupCodes, email, code)) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    if (username) {
      const existingUser = await query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
      if (existingUser.length) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { lastInsertRowid } = await run(
      'INSERT INTO users (email, password_hash, name, username) VALUES (?, ?, ?, ?)',
      [email.toLowerCase(), hash, name || null, username ? username.toLowerCase() : null]
    );
    deleteCode(signupCodes, email);

    const token = jwt.sign(
      { id: lastInsertRowid, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: lastInsertRowid, email: email.toLowerCase() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const rows = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /auth/reset-password ───────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) {
      return res.status(400).json({ error: 'Email, password, and code are required' });
    }

    // Verify reset code
    if (!isValidCode(resetCodes, email, code)) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await run(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hash, email.toLowerCase()]
    );
    deleteCode(resetCodes, email);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PUT /auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const userId = req.user.id;

    const updates = [];
    const args = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name || null);
    }

    if (username !== undefined) {
      if (username) {
        // Verify unique username
        const existing = await query('SELECT id FROM users WHERE username = ? AND id != ?', [username.toLowerCase(), userId]);
        if (existing.length) {
          return res.status(409).json({ error: 'Username is already taken' });
        }
        updates.push('username = ?');
        args.push(username.toLowerCase());
      } else {
        updates.push('username = NULL');
      }
    }

    if (password !== undefined) {
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password_hash = ?');
      args.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    args.push(userId);
    await run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const rows = await query('SELECT id, email, name, username, created_at FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
