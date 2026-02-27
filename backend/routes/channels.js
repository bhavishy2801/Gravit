import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/channels — List all channels grouped by category
// ═══════════════════════════════════════════════════════
router.get('/', async (req, res, next) => {
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
      });
    }

    const channels = Object.values(categoryMap);

    res.json({ channels });
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
