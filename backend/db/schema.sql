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
  role VARCHAR(20) NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'moderator', 'admin')),
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
