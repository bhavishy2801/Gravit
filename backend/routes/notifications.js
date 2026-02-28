import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/notifications — List notifications for current user
// ═══════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res, next) => {
    try {
        const result = await query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

        const unreadCount = await query(
            'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [req.user.id]
        );

        res.json({
            notifications: result.rows.map(n => ({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                link: n.link,
                isRead: n.is_read,
                createdAt: n.created_at,
            })),
            unreadCount: parseInt(unreadCount.rows[0].cnt),
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// GET /api/notifications/unread-count — Quick badge count
// ═══════════════════════════════════════════════════════
router.get('/unread-count', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].cnt) });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// PUT /api/notifications/:id/read — Mark one as read
// ═══════════════════════════════════════════════════════
router.put('/:id/read', authenticate, async (req, res, next) => {
    try {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// PUT /api/notifications/read-all — Mark all as read
// ═══════════════════════════════════════════════════════
router.put('/read-all', authenticate, async (req, res, next) => {
    try {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [req.user.id]
        );
        res.json({ message: 'All marked as read' });
    } catch (err) {
        next(err);
    }
});

export default router;
