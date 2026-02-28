import { query } from '../config/database.js';

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database with 10-minute expiry
 */
export async function storeOTP(phone, code, purpose = 'verify') {
  // Invalidate any existing unused OTPs for this phone+purpose
  await query(
    `UPDATE otp_codes SET used = TRUE WHERE phone = $1 AND purpose = $2 AND used = FALSE`,
    [phone, purpose]
  );

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await query(
    `INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [phone, code, purpose, expiresAt]
  );
}

/**
 * Verify OTP from database
 */
export async function verifyOTP(phone, code, purpose = 'verify') {
  const result = await query(
    `SELECT id FROM otp_codes
     WHERE phone = $1 AND code = $2 AND purpose = $3
       AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code, purpose]
  );

  if (result.rows.length === 0) {
    return false;
  }

  // Mark as used
  await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);
  return true;
}

/**
 * Send SMS via Textbelt (free tier: 1 SMS/day per IP, or use API key)
 * For production, get a key at https://textbelt.com (very cheap: $0.01/SMS)
 *
 * Set TEXTBELT_KEY in .env:
 *   - "textbelt" = free tier (1/day)
 *   - A paid key for production
 */
export async function sendSMS(phone, message) {
  const key = process.env.TEXTBELT_KEY || 'textbelt';

  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message,
        key,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      console.error('Textbelt SMS failed:', data);
      return { success: false, error: data.error || 'SMS sending failed' };
    }

    console.log(`📱 SMS sent to ${phone} (quota remaining: ${data.quotaRemaining})`);
    return { success: true, quotaRemaining: data.quotaRemaining };
  } catch (err) {
    console.error('SMS send error:', err);
    return { success: false, error: err.message };
  }
}
