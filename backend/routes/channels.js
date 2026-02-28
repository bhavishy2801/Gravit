import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/channels — List all channels grouped by category
// ═══════════════════════════════════════════════════════
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*,
        COALESCE(counts.active_count, 0) as active_post_count
      FROM channels c
      LEFT JOIN (
        SELECT channel_id, COUNT(*) as active_count
        FROM posts
        WHERE state != 'resolved'
        GROUP BY channel_id
      ) counts ON c.id = counts.channel_id
      ORDER BY c.sort_order
    `);

    // Get unread counts per channel if user is logged in
    let unreadMap = {};
    if (req.user) {
      const unreadResult = await query(`
        SELECT p.channel_id,
          COUNT(*) FILTER (WHERE p.created_at > COALESCE(cr.last_read_at, '1970-01-01')) as unread_count
        FROM posts p
        LEFT JOIN channel_reads cr ON cr.channel_id = p.channel_id AND cr.user_id = $1
        WHERE p.state != 'resolved'
        GROUP BY p.channel_id
      `, [req.user.id]);
      for (const r of unreadResult.rows) {
        unreadMap[r.channel_id] = parseInt(r.unread_count);
      }
    }

    // Group by category
    const categoryMap = {};
    for (const ch of result.rows) {
      if (!categoryMap[ch.category]) {
        categoryMap[ch.category] = {
          id: ch.category,
          name: ch.category.charAt(0).toUpperCase() + ch.category.slice(1),
          icon: ch.category_icon,
          subChannels: [],
        };
      }
      categoryMap[ch.category].subChannels.push({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        activePostCount: parseInt(ch.active_post_count),
        unreadCount: unreadMap[ch.id] || 0,
      });
    }

    const channels = Object.values(categoryMap);

    res.json({ channels });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/channels/:id/read — Mark channel as read
// ═══════════════════════════════════════════════════════
router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    await query(`
      INSERT INTO channel_reads (user_id, channel_id, last_read_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = NOW()
    `, [req.user.id, req.params.id]);

    res.json({ message: 'Channel marked as read' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/channels/:id — Get single channel info
// ═══════════════════════════════════════════════════════
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM channels WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
