import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/users/profile — Get user profile
// ═══════════════════════════════════════════════════════
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.*, i.name as institution_name, i.domain as institution_domain
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      WHERE u.id = $1
    `, [req.user.id]);

    const user = result.rows[0];

    res.json({
      profile: {
        id: user.id,
        email: user.email,
        pseudonym: user.pseudonym,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
        hasGoogle: !!user.google_id,
        hasPassword: !!user.password_hash,
        institution: user.institution_name,
        institutionDomain: user.institution_domain,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/users/phone/link — Link phone number
// ═══════════════════════════════════════════════════════
router.post('/phone/link', authenticate, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone format (Indian mobile)
    const phoneRegex = /^\+?91?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({ error: 'Invalid Indian mobile number' });
    }

    // Normalize
    let normalized = phone.replace(/[\s-]/g, '');
    if (!normalized.startsWith('+91')) {
      normalized = '+91' + normalized.replace(/^91/, '');
    }

    // Check if phone already in use
    const existing = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [normalized, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This phone number is already linked to another account' });
    }

    // Store phone (unverified)
    await query(
      'UPDATE users SET phone = $1, phone_verified = FALSE WHERE id = $2',
      [normalized, req.user.id]
    );

    // In production, send OTP via Twilio here
    console.log(`📱 Verification OTP for ${normalized}: 123456 (demo mode)`);

    res.json({ message: 'Phone number linked. Please verify with OTP.', phone: normalized });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/users/phone/verify — Verify phone with OTP
// ═══════════════════════════════════════════════════════
router.post('/phone/verify', authenticate, async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'OTP is required' });
    }

    // Demo OTP validation
    if (otp !== '123456') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Check user has a phone
    const user = await query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.phone) {
      return res.status(400).json({ error: 'No phone number linked. Link a phone first.' });
    }

    // Mark verified
    await query(
      'UPDATE users SET phone_verified = TRUE WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Phone number verified successfully', phoneVerified: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// PUT /api/users/password — Set/change password
// ═══════════════════════════════════════════════════════
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // If user already has a password, verify current
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
