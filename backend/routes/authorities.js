import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Middleware: require admin role
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ═══════════════════════════════════════════════════════
// POST /api/authorities/assign — Assign a user to a category+level
// Only admins can assign authorities
// ═══════════════════════════════════════════════════════
router.post('/assign', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { userId, category, hierarchyLevel } = req.body;

        if (!userId || !category || !hierarchyLevel) {
            return res.status(400).json({ error: 'userId, category, and hierarchyLevel are required' });
        }

        // Verify the user exists
        const userCheck = await query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify the hierarchy level exists for this category
        const hierarchyCheck = await query(
            'SELECT role_title FROM escalation_hierarchy WHERE category = $1 AND level = $2',
            [category, hierarchyLevel]
        );
        if (hierarchyCheck.rows.length === 0) {
            return res.status(400).json({ error: `No hierarchy level ${hierarchyLevel} for category "${category}"` });
        }

        // Promote user to authority role if they're still a student
        if (userCheck.rows[0].role === 'student') {
            await query("UPDATE users SET role = 'authority' WHERE id = $1", [userId]);
        }

        // Create the assignment
        const result = await query(`
      INSERT INTO authority_assignments (user_id, category, hierarchy_level)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, category) DO UPDATE SET hierarchy_level = $3
      RETURNING *
    `, [userId, category, hierarchyLevel]);

        res.status(201).json({
            assignment: {
                id: result.rows[0].id,
                userId: result.rows[0].user_id,
                category: result.rows[0].category,
                hierarchyLevel: result.rows[0].hierarchy_level,
                roleTitle: hierarchyCheck.rows[0].role_title,
                userEmail: userCheck.rows[0].email,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// GET /api/authorities — List all authority assignments
// ═══════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res, next) => {
    try {
        const result = await query(`
      SELECT aa.*, u.email, u.pseudonym, u.display_name, u.avatar_hue,
             eh.role_title, eh.response_window_hours
      FROM authority_assignments aa
      JOIN users u ON u.id = aa.user_id
      LEFT JOIN escalation_hierarchy eh
        ON eh.category = aa.category AND eh.level = aa.hierarchy_level
      ORDER BY aa.category, aa.hierarchy_level
    `);

        res.json({
            assignments: result.rows.map(a => ({
                id: a.id,
                userId: a.user_id,
                email: a.email,
                name: a.display_name || a.pseudonym,
                avatarHue: a.avatar_hue,
                category: a.category,
                hierarchyLevel: a.hierarchy_level,
                roleTitle: a.role_title,
                responseWindowHours: a.response_window_hours,
                createdAt: a.created_at,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// GET /api/authorities/my-assignments — Get current user's assignments
// ═══════════════════════════════════════════════════════
router.get('/my-assignments', authenticate, async (req, res, next) => {
    try {
        const result = await query(`
      SELECT aa.*, eh.role_title, eh.response_window_hours
      FROM authority_assignments aa
      LEFT JOIN escalation_hierarchy eh
        ON eh.category = aa.category AND eh.level = aa.hierarchy_level
      WHERE aa.user_id = $1
      ORDER BY aa.category
    `, [req.user.id]);

        res.json({
            assignments: result.rows.map(a => ({
                id: a.id,
                category: a.category,
                hierarchyLevel: a.hierarchy_level,
                roleTitle: a.role_title,
                responseWindowHours: a.response_window_hours,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// GET /api/authorities/posts — Get posts assigned to this authority
// Returns posts from their assigned categories, at their escalation
// level or below (i.e., posts they should be handling)
// ═══════════════════════════════════════════════════════
router.get('/posts', authenticate, async (req, res, next) => {
    try {
        // Get authority's assignments
        const assignments = await query(
            'SELECT category, hierarchy_level FROM authority_assignments WHERE user_id = $1',
            [req.user.id]
        );

        if (assignments.rows.length === 0) {
            return res.json({ posts: [], assignments: [] });
        }

        // Build a filter for posts in their categories
        // An authority sees posts that:
        // 1. Are in their assigned category's channels
        // 2. Are not yet resolved
        // 3. Have escalated to their level or are at their level
        const categoryFilters = assignments.rows.map((a, i) => {
            const catParam = `$${i * 2 + 1}`;
            const levelParam = `$${i * 2 + 2}`;
            return `(c.category = ${catParam} AND COALESCE(p.current_escalation_level, 0) <= ${levelParam})`;
        });

        const params = assignments.rows.flatMap(a => [a.category, a.hierarchy_level]);

        const result = await query(`
      SELECT p.*, c.category, c.name as channel_name,
             u.pseudonym as author_name, u.avatar_hue as author_hue
      FROM posts p
      JOIN channels c ON p.channel_id = c.id
      JOIN users u ON p.author_id = u.id
      WHERE p.state != 'resolved'
        AND (${categoryFilters.join(' OR ')})
      ORDER BY
        CASE p.state
          WHEN 'escalated' THEN 1
          WHEN 'trending' THEN 2
          WHEN 'open' THEN 3
          ELSE 4
        END,
        p.urgency_score DESC,
        p.created_at DESC
      LIMIT 100
    `, params);

        res.json({
            posts: result.rows.map(p => ({
                id: p.id,
                title: p.title,
                content: p.content,
                channelId: p.channel_id,
                channelName: p.channel_name,
                category: p.category,
                state: p.state,
                urgencyScore: p.urgency_score,
                upvoteCount: p.upvote_count,
                commentCount: p.comment_count,
                currentEscalationLevel: p.current_escalation_level,
                authorName: p.author_name,
                authorHue: p.author_hue,
                createdAt: p.created_at,
            })),
            assignments: assignments.rows.map(a => ({
                category: a.category,
                hierarchyLevel: a.hierarchy_level,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// GET /api/authorities/hierarchy/:category — Get hierarchy for a category
// ═══════════════════════════════════════════════════════
router.get('/hierarchy/:category', authenticate, async (req, res, next) => {
    try {
        const result = await query(`
      SELECT eh.*,
        aa.user_id as assigned_user_id,
        u.email as assigned_email,
        u.display_name as assigned_name,
        u.pseudonym as assigned_pseudonym
      FROM escalation_hierarchy eh
      LEFT JOIN authority_assignments aa
        ON aa.category = eh.category AND aa.hierarchy_level = eh.level
      LEFT JOIN users u ON u.id = aa.user_id
      WHERE eh.category = $1
      ORDER BY eh.level
    `, [req.params.category]);

        res.json({
            hierarchy: result.rows.map(h => ({
                level: h.level,
                roleTitle: h.role_title,
                responseWindowHours: h.response_window_hours,
                assignedUser: h.assigned_user_id ? {
                    id: h.assigned_user_id,
                    email: h.assigned_email,
                    name: h.assigned_name || h.assigned_pseudonym,
                } : null,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/authorities/:id — Remove an assignment
// ═══════════════════════════════════════════════════════
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await query(
            'DELETE FROM authority_assignments WHERE id = $1 RETURNING user_id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Check if user has any remaining assignments
        const remaining = await query(
            'SELECT COUNT(*) as cnt FROM authority_assignments WHERE user_id = $1',
            [result.rows[0].user_id]
        );

        // If no more assignments, revert role to student
        if (parseInt(remaining.rows[0].cnt) === 0) {
            await query("UPDATE users SET role = 'student' WHERE id = $1 AND role = 'authority'",
                [result.rows[0].user_id]
            );
        }

        res.json({ message: 'Assignment removed' });
    } catch (err) {
        next(err);
    }
});

export default router;
