-- Gravit Migration: Add profile fields, hostel channels, channel_read, display_name
-- Run this against an existing database to add the new columns/tables

-- ─── New user columns ───────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hostel VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS programme VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- ─── Channel read tracking (unread counters) ────────
CREATE TABLE IF NOT EXISTS channel_reads (
  user_id UUID NOT NULL REFERENCES users(id),
  channel_id VARCHAR(50) NOT NULL REFERENCES channels(id),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_reads_user ON channel_reads(user_id);

-- ─── OTP storage for real SMS ───────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'verify',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, purpose);
