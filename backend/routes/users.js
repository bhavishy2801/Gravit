import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { generateOTP, storeOTP, verifyOTP, sendSMS } from '../services/otp.js';

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
        displayName: user.display_name,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
        gender: user.gender,
        hostel: user.hostel,
        yearOfStudy: user.year_of_study,
        programme: user.programme,
        department: user.department,
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

    // Generate and send real OTP
    const code = generateOTP();
    await storeOTP(normalized, code, 'verify');

    const smsResult = await sendSMS(normalized, `Your Gravit verification OTP is: ${code}. Valid for 10 minutes.`);
    if (!smsResult.success) {
      console.warn('SMS failed, OTP stored in DB:', code);
    }

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

    // Check user has a phone
    const user = await query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.phone) {
      return res.status(400).json({ error: 'No phone number linked. Link a phone first.' });
    }

    // Verify OTP from database
    const valid = await verifyOTP(user.rows[0].phone, otp, 'verify');
    if (!valid) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
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

// ═══════════════════════════════════════════════════════
// PUT /api/users/profile — Update profile fields
// ═══════════════════════════════════════════════════════
const VALID_HOSTELS = ['B1','B2','B3','B4','B5','G1','G2','G3','G4','G5','G6','I2','I3','O3','O4','Y3','Y4'];
const VALID_GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
const VALID_PROGRAMMES = ['B.Tech', 'M.Tech', 'M.Sc', 'Ph.D', 'MBA', 'M.Des', 'Other'];

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { displayName, gender, hostel, yearOfStudy, programme, department } = req.body;

    // Validate hostel (one-time set — can't change once set)
    if (hostel) {
      if (!VALID_HOSTELS.includes(hostel)) {
        return res.status(400).json({ error: `Invalid hostel. Must be one of: ${VALID_HOSTELS.join(', ')}` });
      }
      // Check if hostel already set
      const existing = await query('SELECT hostel FROM users WHERE id = $1', [req.user.id]);
      if (existing.rows[0]?.hostel) {
        return res.status(400).json({ error: 'Hostel can only be set once and cannot be changed' });
      }
    }

    if (gender && !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    if (programme && !VALID_PROGRAMMES.includes(programme)) {
      return res.status(400).json({ error: 'Invalid programme value' });
    }

    // Build dynamic UPDATE
    const updates = [];
    const params = [];
    let idx = 1;

    if (displayName !== undefined) { updates.push(`display_name = $${idx++}`); params.push(displayName); }
    if (gender) { updates.push(`gender = $${idx++}`); params.push(gender); }
    if (hostel) { updates.push(`hostel = $${idx++}`); params.push(hostel); }
    if (yearOfStudy) { updates.push(`year_of_study = $${idx++}`); params.push(yearOfStudy); }
    if (programme) { updates.push(`programme = $${idx++}`); params.push(programme); }
    if (department) { updates.push(`department = $${idx++}`); params.push(department); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.user.id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );

    // Fetch updated profile
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
        displayName: user.display_name,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
        gender: user.gender,
        hostel: user.hostel,
        yearOfStudy: user.year_of_study,
        programme: user.programme,
        department: user.department,
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

export default router;
