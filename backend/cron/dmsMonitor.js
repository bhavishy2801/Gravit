import { transitionState } from '../services/stateMachine.js';

/**
 * Dead Man's Switch Monitor
 * Runs every hour — checks for posts where admin hasn't responded
 * within the response window and auto-escalates.
 */
export function createDMSMonitor(pool, io) {
  return async function dmsCheck() {
    try {
      // Find escalated posts where deadline has passed with no response
      const result = await pool.query(`
        SELECT p.id, p.current_escalation_level, p.channel_id,
          c.category,
          eh_next.role_title as next_role,
          eh_next.contact_email as next_email,
          eh_next.response_window_hours as next_window
        FROM posts p
        JOIN channels c ON p.channel_id = c.id
        LEFT JOIN escalation_hierarchy eh_next
          ON c.category = eh_next.category
          AND eh_next.level = p.current_escalation_level + 1
        WHERE p.state IN ('escalated', 'resolution_rejected')
          AND p.response_deadline IS NOT NULL
          AND p.response_deadline < NOW()
          AND p.last_admin_response_at IS NULL
          AND p.current_escalation_level < 4
      `);

      for (const post of result.rows) {
        const newLevel = post.current_escalation_level + 1;

        console.log(`⏰ DMS triggered: Post ${post.id} → Level ${newLevel} (${post.next_role || 'Public'})`);

        // Transition state (escalated → escalated with higher level)
        try {
          await transitionState(post.id, 'escalated', {
            escalationLevel: newLevel,
            responseWindowHours: post.next_window || 72,
          });

          // Log escalation
          await pool.query(`
            INSERT INTO escalations (post_id, level, trigger_type, notified_email)
            VALUES ($1, $2, 'dead_mans_switch', $3)
          `, [post.id, newLevel, post.next_email]);

          // Broadcast DMS trigger
          io.to(`post:${post.id}`).emit('dms:triggered', {
            postId: post.id,
            newLevel,
            role: post.next_role || 'Public',
          });

          // TODO: Fire n8n webhook for PDF + email
          // await fetch(process.env.N8N_WEBHOOK_URL, {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ postId: post.id, triggerType: 'dead_mans_switch', level: newLevel }),
          // });
        } catch (err) {
          console.error(`  ❌ Failed to escalate post ${post.id}:`, err.message);
        }
      }

      if (result.rows.length > 0) {
        console.log(`⏰ DMS check complete: ${result.rows.length} escalation(s)`);
      }
    } catch (err) {
      console.error('❌ DMS Monitor error:', err.message);
    }
  };
}
