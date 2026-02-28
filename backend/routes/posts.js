import { Router } from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { calculateUrgencyScore, THRESHOLDS } from '../services/urgencyScoring.js';
import { transitionState } from '../services/stateMachine.js';
import { checkContent } from '../services/moderation.js';
import { getAuthorityAtLevel } from '../services/escalationConfig.js';
import { sendEscalationEmail } from '../services/email.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/posts/search — Search posts by title/content
// ═══════════════════════════════════════════════════════
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ posts: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const result = await query(`
      SELECT p.id, p.title, p.channel_id, p.state, p.created_at,
        u.pseudonym as author, u.display_name as author_display_name
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.title ILIKE $1 OR p.content ILIKE $1
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [searchTerm]);

    const posts = result.rows.map(p => ({
      id: p.id,
      title: p.title,
      channelId: p.channel_id,
      state: p.state,
      author: p.author_display_name || p.author,
      createdAt: p.created_at,
    }));

    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/posts — List posts (with optional filters)
// ═══════════════════════════════════════════════════════
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { channel, category, state, sort = 'urgency', limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT p.*,
        u.pseudonym as author,
        u.display_name as author_display_name,
        u.avatar_hue as author_avatar_hue,
        c.category as category_id
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN channels c ON p.channel_id = c.id
    `;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (channel) {
      conditions.push(`p.channel_id = $${paramIdx++}`);
      params.push(channel);
    }

    if (category) {
      conditions.push(`c.category = $${paramIdx++}`);
      params.push(category);
    }

    if (state) {
      conditions.push(`p.state = $${paramIdx++}`);
      params.push(state);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sort
    switch (sort) {
      case 'newest':
        sql += ' ORDER BY p.created_at DESC';
        break;
      case 'upvotes':
        sql += ' ORDER BY p.upvote_count DESC';
        break;
      case 'urgency':
      default:
        sql += ' ORDER BY p.urgency_score DESC';
        break;
    }

    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // If user is logged in, check which posts they've upvoted
    let userUpvotes = new Set();
    if (req.user) {
      const upvoteResult = await query(
        'SELECT post_id FROM upvotes WHERE user_id = $1',
        [req.user.id]
      );
      userUpvotes = new Set(upvoteResult.rows.map(r => r.post_id));
    }

    const posts = result.rows.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      author: p.author_display_name || p.author,
      authorId: p.author_id,
      authorAvatarHue: p.author_avatar_hue,
      channelId: p.channel_id,
      categoryId: p.category_id,
      tags: p.tags,
      urgencyScore: parseFloat(p.urgency_score),
      state: p.state,
      escalationLevel: p.current_escalation_level,
      escalatedAt: p.escalated_at,
      responseDeadline: p.response_deadline,
      adminResponse: p.admin_response,
      upvotes: p.upvote_count,
      commentCount: p.comment_count,
      createdAt: p.created_at,
      upvoted: userUpvotes.has(p.id),
    }));

    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/posts/:id — Get single post
// ═══════════════════════════════════════════════════════
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*,
        u.pseudonym as author,
        u.display_name as author_display_name,
        u.avatar_hue as author_avatar_hue,
        c.category as category_id
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN channels c ON p.channel_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const p = result.rows[0];

    // Check if user has upvoted
    let upvoted = false;
    if (req.user) {
      const upvoteCheck = await query(
        'SELECT 1 FROM upvotes WHERE user_id = $1 AND post_id = $2',
        [req.user.id, p.id]
      );
      upvoted = upvoteCheck.rows.length > 0;
    }

    // Get verification data if pending
    let verification = null;
    if (p.state === 'pending_verification') {
      const vResult = await query(
        'SELECT * FROM resolution_verifications WHERE post_id = $1 ORDER BY created_at DESC LIMIT 1',
        [p.id]
      );
      if (vResult.rows.length > 0) {
        const v = vResult.rows[0];
        verification = {
          id: v.id,
          resolutionDescription: v.resolution_description,
          deadline: v.deadline,
          outcome: v.outcome,
          yesCount: v.yes_count,
          noCount: v.no_count,
          totalVotes: v.total_votes,
        };

        // Check if user has voted
        if (req.user) {
          const voteCheck = await query(
            'SELECT vote FROM verification_votes WHERE user_id = $1 AND verification_id = $2',
            [req.user.id, v.id]
          );
          if (voteCheck.rows.length > 0) {
            verification.userVote = voteCheck.rows[0].vote ? 'yes' : 'no';
          }
        }
      }
    }

    res.json({
      post: {
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author_display_name || p.author,
        authorId: p.author_id,
        authorAvatarHue: p.author_avatar_hue,
        channelId: p.channel_id,
        categoryId: p.category_id,
        tags: p.tags,
        urgencyScore: parseFloat(p.urgency_score),
        state: p.state,
        escalationLevel: p.current_escalation_level,
        escalatedAt: p.escalated_at,
        responseDeadline: p.response_deadline,
        adminResponse: p.admin_response,
        upvotes: p.upvote_count,
        commentCount: p.comment_count,
        createdAt: p.created_at,
        upvoted,
        verification,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/posts — Create a new post
// ═══════════════════════════════════════════════════════
router.post('/', authenticate, rbac('student', 'moderator'), async (req, res, next) => {
  try {
    const { title, content, channelId, tags = [] } = req.body;

    if (!title || !content || !channelId) {
      return res.status(400).json({ error: 'Title, content, and channelId are required' });
    }

    // Verify channel exists
    const channelCheck = await query('SELECT id, category FROM channels WHERE id = $1', [channelId]);
    if (channelCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    // Hostel channel restriction: if channel starts with "hostel-", user must belong to that hostel
    const channel = channelCheck.rows[0];
    if (channelId.startsWith('hostel-')) {
      // Extract hostel code: "hostel-b1" → "B1", "hostel-b1-water" → "B1"
      const parts = channelId.replace('hostel-', '').split('-');
      const hostelCode = parts[0].toUpperCase();
      const userHostel = req.user.hostel;
      if (!userHostel) {
        return res.status(403).json({ error: 'Please set your hostel in your profile before posting to hostel channels' });
      }
      if (userHostel !== hostelCode && req.user.role === 'student') {
        return res.status(403).json({ error: `You can only post in your own hostel (${userHostel}) channels` });
      }
    }

    // ── AI Content Moderation ────────────────────────
    const moderation = await checkContent(title + ' ' + content);
    if (moderation.flagged) {
      return res.status(400).json({
        error: `Content blocked by moderation: ${moderation.reason}`,
        categories: moderation.categories,
      });
    }

    const result = await query(`
      INSERT INTO posts (title, content, author_id, channel_id, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, content, req.user.id, channelId, tags]);

    const post = result.rows[0];

    // Get author info
    const userResult = await query('SELECT pseudonym, display_name, avatar_hue FROM users WHERE id = $1', [req.user.id]);
    const author = userResult.rows[0];

    // Emit new post event
    const io = req.app.get('io');
    io.to(`channel:${channelId}`).emit('post:new', {
      id: post.id,
      title: post.title,
      channelId: post.channel_id,
      author: author.display_name || author.pseudonym,
      urgencyScore: 0,
      state: 'open',
    });

    res.status(201).json({
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: author.display_name || author.pseudonym,
        authorAvatarHue: author.avatar_hue,
        channelId: post.channel_id,
        tags: post.tags,
        urgencyScore: 0,
        state: 'open',
        escalationLevel: 0,
        upvotes: 0,
        commentCount: 0,
        createdAt: post.created_at,
        upvoted: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/posts/:id/upvote — Toggle upvote
// ═══════════════════════════════════════════════════════
router.post('/:id/upvote', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if already upvoted
    const existing = await query(
      'SELECT 1 FROM upvotes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    let upvoted;
    if (existing.rows.length > 0) {
      // Remove upvote
      await query('DELETE FROM upvotes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      await query('UPDATE posts SET upvote_count = upvote_count - 1 WHERE id = $1', [postId]);
      upvoted = false;
    } else {
      // Add upvote
      await query('INSERT INTO upvotes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
      await query('UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = $1', [postId]);
      upvoted = true;

      // Notify post author about upvote
      const postAuthor = await query('SELECT author_id, title FROM posts WHERE id = $1', [postId]);
      const authorId = postAuthor.rows[0]?.author_id;
      if (authorId && authorId !== userId) {
        const postTitle = postAuthor.rows[0].title.substring(0, 80);
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
          [authorId, 'upvote', 'Your post got an upvote!', `"${postTitle}" received an upvote.`, `/posts/${postId}`]
        );
        // Push notification in real-time
        const io = req.app.get('io');
        io.to(`user:${authorId}`).emit('notification:new', {
          type: 'upvote', title: 'Your post got an upvote!',
          message: `"${postTitle}" received an upvote.`, link: `/posts/${postId}`,
        });
      }
    }

    // Recalculate urgency score
    const newScore = await calculateUrgencyScore(postId);

    // Check for state transitions
    const postResult = await query('SELECT state, current_escalation_level FROM posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];

    let newState = post.state;
    if (post.state === 'open' && newScore >= THRESHOLDS.T1_TRENDING) {
      const updated = await transitionState(postId, 'trending');
      newState = updated.state;
    } else if (post.state === 'trending' && newScore >= THRESHOLDS.T2_ESCALATED) {
      // Get category info
      const postFull = await query(
        'SELECT p.title, p.content, c.category, c.name as channel_name FROM posts p JOIN channels c ON p.channel_id = c.id WHERE p.id = $1',
        [postId]
      );
      const category = postFull.rows[0]?.category;
      const channelName = postFull.rows[0]?.channel_name || category;
      const pTitle = postFull.rows[0]?.title || 'Untitled';
      const pContent = postFull.rows[0]?.content || '';

      // Get authority info from escalation config
      const authority = getAuthorityAtLevel(category, 1);
      const hours = authority?.hours || 72;

      const updated = await transitionState(postId, 'escalated', {
        escalationLevel: 1,
        responseWindowHours: hours || 72,   // if hours=0 (final), still give a window for the DB
      });
      newState = updated.state;

      // Log escalation in DB
      await query(
        `INSERT INTO escalations (post_id, level, trigger_type, notified_email)
         VALUES ($1, $2, 'threshold', $3)`,
        [postId, 1, authority?.email || null]
      );

      // ── Send email to the authority ────────────────
      if (authority?.email) {
        const upCount = (await query('SELECT upvote_count FROM posts WHERE id = $1', [postId])).rows[0]?.upvote_count || 0;
        sendEscalationEmail({
          to: authority.email,
          roleTitle: authority.role,
          postTitle: pTitle,
          postContent: pContent,
          channelName,
          category,
          upvoteCount: upCount,
          urgencyScore: newScore,
          escalationLevel: 1,
          postUrl: `/posts/${postId}`,
          responseWindowHours: hours || 'N/A (final tier)',
        }).catch(err => console.error('Email send failed:', err.message));
      }

      // ── In-app notification to assigned platform users ──
      const assignedAuthority = await query(
        'SELECT user_id FROM authority_assignments WHERE category = $1 AND hierarchy_level = $2',
        [category, 1]
      );
      for (const auth of assignedAuthority.rows) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
          [auth.user_id, 'escalation', '⚠️ Post escalated to you',
          `"${pTitle.substring(0, 80)}" in ${category} needs your attention (${hours}h to respond).`,
          `/posts/${postId}`]
        );
        const io = req.app.get('io');
        io.to(`user:${auth.user_id}`).emit('notification:new', {
          type: 'escalation', title: '⚠️ Post escalated to you',
          message: `"${pTitle.substring(0, 80)}" in ${category} needs your attention (${hours}h to respond).`,
          link: `/posts/${postId}`,
        });
      }
    }

    // Get updated upvote count
    const countResult = await query('SELECT upvote_count FROM posts WHERE id = $1', [postId]);
    const upvoteCount = countResult.rows[0].upvote_count;

    // Broadcast urgency update to post room and channel room
    const io = req.app.get('io');
    const urgencyData = {
      postId,
      score: newScore,
      state: newState,
      upvoteCount,
    };
    io.to(`post:${postId}`).emit('urgency:update', urgencyData);

    // Also broadcast to channel feed viewers
    const postChannelResult = await query('SELECT channel_id FROM posts WHERE id = $1', [postId]);
    const postChannelId = postChannelResult.rows[0]?.channel_id;
    if (postChannelId) {
      io.to(`channel:${postChannelId}`).emit('post:updated', urgencyData);
    }

    res.json({
      upvoted,
      upvoteCount,
      urgencyScore: newScore,
      state: newState,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/posts/:id/resolve — Admin marks post resolved
// ═══════════════════════════════════════════════════════
router.post('/:id/resolve', authenticate, rbac('admin'), async (req, res, next) => {
  try {
    const { resolutionDescription } = req.body;
    if (!resolutionDescription) {
      return res.status(400).json({ error: 'Resolution description is required' });
    }

    const postId = req.params.id;

    // Transition to pending_verification
    const post = await transitionState(postId, 'pending_verification', {
      adminResponse: resolutionDescription,
    });

    // Create verification record with 48h deadline
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await query(`
      INSERT INTO resolution_verifications (post_id, admin_id, resolution_description, deadline)
      VALUES ($1, $2, $3, $4)
    `, [postId, req.user.id, resolutionDescription, deadline]);

    // Broadcast
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('verification:start', {
      postId,
      adminResponse: resolutionDescription,
      deadline: deadline.toISOString(),
    });

    res.json({ post, message: 'Resolution submitted for student verification' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/posts/:id/verify — Student votes on resolution
// ═══════════════════════════════════════════════════════
router.post('/:id/verify', authenticate, rbac('student', 'moderator'), async (req, res, next) => {
  try {
    const { vote } = req.body; // true = yes, false = no
    if (vote === undefined) {
      return res.status(400).json({ error: 'Vote is required (true/false)' });
    }

    const postId = req.params.id;

    // Get active verification
    const vResult = await query(
      `SELECT * FROM resolution_verifications
       WHERE post_id = $1 AND outcome = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [postId]
    );

    if (vResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active verification poll for this post' });
    }

    const verification = vResult.rows[0];

    // Check deadline
    if (new Date(verification.deadline) < new Date()) {
      return res.status(400).json({ error: 'Verification deadline has passed' });
    }

    // Check existing vote
    const existingVote = await query(
      'SELECT 1 FROM verification_votes WHERE user_id = $1 AND verification_id = $2',
      [req.user.id, verification.id]
    );

    if (existingVote.rows.length > 0) {
      return res.status(409).json({ error: 'You have already voted' });
    }

    // Record vote
    await query(
      'INSERT INTO verification_votes (user_id, verification_id, vote) VALUES ($1, $2, $3)',
      [req.user.id, verification.id, vote]
    );

    // Update counts
    const column = vote ? 'yes_count' : 'no_count';
    await query(`
      UPDATE resolution_verifications
      SET ${column} = ${column} + 1, total_votes = total_votes + 1
      WHERE id = $1
    `, [verification.id]);

    // Get updated counts
    const updated = await query(
      'SELECT yes_count, no_count, total_votes FROM resolution_verifications WHERE id = $1',
      [verification.id]
    );

    const counts = updated.rows[0];

    // Broadcast vote
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('verification:vote', {
      postId,
      yesCount: counts.yes_count,
      noCount: counts.no_count,
      totalVotes: counts.total_votes,
    });

    res.json({
      yesCount: counts.yes_count,
      noCount: counts.no_count,
      totalVotes: counts.total_votes,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/posts/:id — Delete a post (author, moderator, or admin)
// ═══════════════════════════════════════════════════════
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const postId = req.params.id;

    // Fetch the post to check ownership
    const postResult = await query('SELECT author_id, channel_id FROM posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.rows[0];
    const isOwner = post.author_id === req.user.id;
    const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete (cascades to upvotes, comments, comment_upvotes)
    await query('DELETE FROM posts WHERE id = $1', [postId]);

    // Broadcast deletion
    const io = req.app.get('io');
    io.to(`channel:${post.channel_id}`).emit('post:deleted', { postId });

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/posts/:id/report — Report a post
// ═══════════════════════════════════════════════════════
router.post('/:id/report', authenticate, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a reason (at least 5 characters)' });
    }

    const postId = req.params.id;

    // Verify post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Prevent duplicate reports
    const existing = await query(
      'SELECT 1 FROM reports WHERE post_id = $1 AND reporter_id = $2',
      [postId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reported this post' });
    }

    await query(
      'INSERT INTO reports (post_id, reporter_id, reason) VALUES ($1, $2, $3)',
      [postId, req.user.id, reason.trim()]
    );

    res.json({ message: 'Report submitted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
