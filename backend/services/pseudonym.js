import crypto from 'crypto';

/**
 * Generate a persistent pseudonym from email + institution salt
 * Format: Anon-XXXX (4 hex chars)
 */
export function generatePseudonym(email, salt) {
  const hash = crypto
    .createHash('sha256')
    .update(`${email}:${salt}`)
    .digest('hex');

  // Take first 4 hex characters, uppercase
  const suffix = hash.substring(0, 4).toUpperCase();
  return `Anon-${suffix}`;
}
