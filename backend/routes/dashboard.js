import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/stats — Dashboard statistics
// ═══════════════════════════════════════════════════════
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    // Run all stat queries in parallel
    const [
      totalPosts,
      escalatedActive,
      resolvedThisMonth,
      pendingVerification,
      avgResolution,
      dmsTriggered,
      verificationSuccess,
      activeUsers,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM posts'),
      query("SELECT COUNT(*) as count FROM posts WHERE state = 'escalated'"),
      query("SELECT COUNT(*) as count FROM posts WHERE state = 'resolved' AND updated_at >= date_trunc('month', NOW())"),
      query("SELECT COUNT(*) as count FROM posts WHERE state = 'pending_verification'"),
      query("SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0) as avg_days FROM posts WHERE state = 'resolved'"),
      query("SELECT COUNT(*) as count FROM escalations WHERE trigger_type = 'dead_mans_switch'"),
      query(`
        SELECT
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE outcome = 'confirmed')::numeric / COUNT(*)::numeric * 100)
            ELSE 0
          END as rate
        FROM resolution_verifications WHERE outcome != 'pending'
      `),
      query("SELECT COUNT(DISTINCT author_id) as count FROM posts WHERE created_at >= NOW() - INTERVAL '30 days'"),
    ]);

    res.json({
      stats: {
        totalPosts: parseInt(totalPosts.rows[0].count),
        escalatedActive: parseInt(escalatedActive.rows[0].count),
        resolvedThisMonth: parseInt(resolvedThisMonth.rows[0].count),
        pendingVerification: parseInt(pendingVerification.rows[0].count),
        avgResolutionTime: `${parseFloat(avgResolution.rows[0].avg_days).toFixed(1)} days`,
        dmsTriggered: parseInt(dmsTriggered.rows[0].count),
        verificationSuccessRate: `${parseInt(verificationSuccess.rows[0].rate)}%`,
        activeUsers: parseInt(activeUsers.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/leaderboard — Department leaderboard
// ═══════════════════════════════════════════════════════
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        c.category as department,
        COUNT(*) FILTER (WHERE p.state = 'resolved') as resolved_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 86400) FILTER (WHERE p.state = 'resolved'), 0) as avg_resolution_days,
        CASE WHEN COUNT(*) FILTER (WHERE p.state IN ('resolved', 'resolution_rejected')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE p.state = 'resolved')::numeric /
            COUNT(*) FILTER (WHERE p.state IN ('resolved', 'resolution_rejected'))::numeric * 100
          )
          ELSE 0
        END as success_rate,
        COUNT(DISTINCT e.id) FILTER (WHERE e.trigger_type = 'dead_mans_switch') as dms_count
      FROM posts p
      JOIN channels c ON p.channel_id = c.id
      LEFT JOIN escalations e ON p.id = e.post_id
      GROUP BY c.category
      ORDER BY resolved_count DESC
    `);

    const leaderboard = result.rows.map((row, idx) => ({
      rank: idx + 1,
      department: row.department.charAt(0).toUpperCase() + row.department.slice(1),
      resolvedCount: parseInt(row.resolved_count),
      avgResolutionDays: parseFloat(parseFloat(row.avg_resolution_days).toFixed(1)),
      successRate: parseInt(row.success_rate),
      dmsCount: parseInt(row.dms_count),
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/dashboard/escalations — Recent escalated posts
// ═══════════════════════════════════════════════════════
router.get('/escalations', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, u.pseudonym as author, c.category as category_id
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN channels c ON p.channel_id = c.id
      WHERE p.state IN ('escalated', 'resolution_rejected')
      ORDER BY p.urgency_score DESC
      LIMIT 10
    `);

    const posts = result.rows.map(p => ({
      id: p.id,
      title: p.title,
      channelId: p.channel_id,
      categoryId: p.category_id,
      urgencyScore: parseFloat(p.urgency_score),
      state: p.state,
      escalationLevel: p.current_escalation_level,
      upvotes: p.upvote_count,
      commentCount: p.comment_count,
    }));

    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

export default router;
