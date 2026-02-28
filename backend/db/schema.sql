-- Gravit Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Institutions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  phone_verified BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(255) UNIQUE,
  pseudonym VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  gender VARCHAR(20),
  hostel VARCHAR(10),
  year_of_study VARCHAR(20),
  programme VARCHAR(30),
  department VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'moderator', 'admin', 'authority')),
  institution_id UUID REFERENCES institutions(id),
  avatar_hue INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Channels ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  category_icon VARCHAR(10),
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ─── Posts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  channel_id VARCHAR(50) NOT NULL REFERENCES channels(id),
  tags TEXT[] DEFAULT '{}',
  urgency_score DECIMAL(10,2) DEFAULT 0,
  state VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (state IN ('open', 'trending', 'escalated',
      'pending_verification', 'resolved', 'resolution_rejected')),
  current_escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  last_admin_response_at TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ,
  admin_response TEXT,
  upvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Upvotes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upvotes (
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ─── Comments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  path VARCHAR(500) NOT NULL,
  depth INTEGER DEFAULT 0,
  parent_id UUID REFERENCES comments(id),
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Escalation Hierarchy ───────────────────────────
CREATE TABLE IF NOT EXISTS escalation_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255),
  response_window_hours INTEGER NOT NULL DEFAULT 72,
  UNIQUE(category, level)
);

-- ─── Escalations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  level INTEGER NOT NULL,
  trigger_type VARCHAR(30) NOT NULL
    CHECK (trigger_type IN ('threshold', 'dead_mans_switch', 'resolution_rejected')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  notified_email VARCHAR(255),
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'sent'
);

-- ─── Resolution Verifications ───────────────────────
CREATE TABLE IF NOT EXISTS resolution_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  admin_id UUID NOT NULL REFERENCES users(id),
  resolution_description TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  outcome VARCHAR(20) DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'confirmed', 'rejected')),
  yes_count INTEGER DEFAULT 0,
  no_count INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Verification Votes ─────────────────────────────
CREATE TABLE IF NOT EXISTS verification_votes (
  user_id UUID NOT NULL REFERENCES users(id),
  verification_id UUID NOT NULL REFERENCES resolution_verifications(id),
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, verification_id)
);

-- ─── Comment Upvotes ────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_upvotes (
  user_id UUID NOT NULL REFERENCES users(id),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- ─── Channel Read Tracking ──────────────────────────
CREATE TABLE IF NOT EXISTS channel_reads (
  user_id UUID NOT NULL REFERENCES users(id),
  channel_id VARCHAR(50) NOT NULL REFERENCES channels(id),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

-- ─── OTP Codes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) NOT NULL DEFAULT 'verify',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (type IN ('upvote', 'comment', 'escalation', 'resolution', 'mention', 'general')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reports ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

-- ─── Servers (user-created) ─────────────────────────
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  owner_id UUID NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT TRUE,
  password_hash VARCHAR(255),
  invite_code VARCHAR(12) UNIQUE,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Server Members ─────────────────────────────────
CREATE TABLE IF NOT EXISTS server_members (
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

-- ─── Server Channels ────────────────────────────────
CREATE TABLE IF NOT EXISTS server_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Server Posts (discussion threads inside server channels) ──
CREATE TABLE IF NOT EXISTS server_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Server Post Replies (threaded replies) ─────────
CREATE TABLE IF NOT EXISTS server_post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES server_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES server_post_replies(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Server Chat Messages (real-time channel chat) ──
CREATE TABLE IF NOT EXISTS server_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES server_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Authority Assignments ──────────────────────────
-- Links authority users to specific categories + hierarchy levels
CREATE TABLE IF NOT EXISTS authority_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  hierarchy_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- ─── Indexes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_channel ON posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_posts_state ON posts(state);
CREATE INDEX IF NOT EXISTS idx_posts_urgency ON posts(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_path ON comments(path);
CREATE INDEX IF NOT EXISTS idx_upvotes_post ON upvotes(post_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_created ON upvotes(created_at);
CREATE INDEX IF NOT EXISTS idx_escalations_post ON escalations(post_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_channel_reads_user ON channel_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone, purpose);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_posts_channel ON server_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_server_posts_server ON server_posts(server_id);
CREATE INDEX IF NOT EXISTS idx_server_post_replies_post ON server_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_server_chat_channel ON server_chat_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_authority_user ON authority_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_authority_category ON authority_assignments(category, hierarchy_level);

-- ═══════════════════════════════════════════════════════
-- Migrations: safely add columns / indexes to existing tables
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  -- Add invite_code to servers if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'servers' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE servers ADD COLUMN invite_code VARCHAR(12) UNIQUE;
  END IF;
END
$$;

-- Now safe to create the index (column guaranteed to exist)
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON servers(invite_code);

-- Add contact_email to escalation_hierarchy if missing (for email escalation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'escalation_hierarchy' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE escalation_hierarchy ADD COLUMN contact_email VARCHAR(255);
  END IF;
END
$$;

-- Index for faster escalation lookups by category+level
CREATE INDEX IF NOT EXISTS idx_escalation_category_level ON escalation_hierarchy(category, level);
