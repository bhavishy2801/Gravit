import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/database.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { generatePseudonym } from '../services/pseudonym.js';

const router = Router();
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'iitj.ac.in';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ═══════════════════════════════════════════════════════
// POST /api/auth/register — Email + Password registration
// ═══════════════════════════════════════════════════════
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate domain
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({
        error: `Only @${ALLOWED_DOMAIN} emails are allowed`,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Get institution
    const inst = await query('SELECT id, salt FROM institutions WHERE domain = $1', [ALLOWED_DOMAIN]);
    if (inst.rows.length === 0) {
      return res.status(500).json({ error: 'Institution not configured' });
    }
    const { id: institutionId, salt } = inst.rows[0];

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const pseudonym = generatePseudonym(email.toLowerCase(), salt);
    const avatarHue = Math.floor(Math.random() * 360);

    const result = await query(`
      INSERT INTO users (email, password_hash, pseudonym, role, institution_id, avatar_hue)
      VALUES ($1, $2, $3, 'student', $4, $5)
      RETURNING id, email, pseudonym, role, institution_id, avatar_hue, created_at
    `, [email.toLowerCase(), passwordHash, pseudonym, institutionId, avatarHue]);

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudonym: user.pseudonym,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: null,
        phoneVerified: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/auth/login — Email + Password login
// ═══════════════════════════════════════════════════════
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account uses Google sign-in. Please log in with Google.',
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudonym: user.pseudonym,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/auth/google — Google OAuth login/register
// ═══════════════════════════════════════════════════════
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    const { sub: googleId, email, email_verified } = payload;

    if (!email_verified) {
      return res.status(403).json({ error: 'Email not verified by Google' });
    }

    // Validate domain
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({
        error: `Only @${ALLOWED_DOMAIN} emails are allowed. Please sign in with your IITJ email.`,
      });
    }

    // Check if user exists (by google_id or email)
    let result = await query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email.toLowerCase()]
    );

    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
      // Link Google ID if not already linked
      if (!user.google_id) {
        await query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      }
    } else {
      // Create new user
      const inst = await query('SELECT id, salt FROM institutions WHERE domain = $1', [ALLOWED_DOMAIN]);
      if (inst.rows.length === 0) {
        return res.status(500).json({ error: 'Institution not configured' });
      }
      const { id: institutionId, salt } = inst.rows[0];

      const pseudonym = generatePseudonym(email.toLowerCase(), salt);
      const avatarHue = Math.floor(Math.random() * 360);

      const insertResult = await query(`
        INSERT INTO users (email, google_id, pseudonym, role, institution_id, avatar_hue)
        VALUES ($1, $2, $3, 'student', $4, $5)
        RETURNING *
      `, [email.toLowerCase(), googleId, pseudonym, institutionId, avatarHue]);

      user = insertResult.rows[0];
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudonym: user.pseudonym,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/auth/phone/send-otp — Send OTP for phone login
// ═══════════════════════════════════════════════════════
router.post('/phone/send-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if phone exists and is verified
    const result = await query(
      'SELECT id FROM users WHERE phone = $1 AND phone_verified = TRUE',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No account found with this phone number. Please link your phone in your profile first.',
      });
    }

    // In production, integrate Twilio/MSG91 here
    // For hackathon demo, OTP is always 123456
    console.log(`📱 OTP for ${phone}: 123456 (demo mode)`);

    res.json({ message: 'OTP sent successfully', demo: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/auth/phone/verify-otp — Verify OTP and login
// ═══════════════════════════════════════════════════════
router.post('/phone/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    // Demo OTP validation (in production use Twilio verify)
    if (otp !== '123456') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const result = await query(
      'SELECT * FROM users WHERE phone = $1 AND phone_verified = TRUE',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No verified account found with this phone number' });
    }

    const user = result.rows[0];
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        pseudonym: user.pseudonym,
        role: user.role,
        avatarHue: user.avatar_hue,
        phone: user.phone,
        phoneVerified: user.phone_verified,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/auth/me — Get current user
// ═══════════════════════════════════════════════════════
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      pseudonym: req.user.pseudonym,
      role: req.user.role,
      avatarHue: req.user.avatar_hue,
      phone: req.user.phone,
      phoneVerified: req.user.phone_verified,
      createdAt: req.user.created_at,
    },
  });
});

export default router;
