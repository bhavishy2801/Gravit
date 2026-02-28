import { transitionState } from '../services/stateMachine.js';
import { getAuthorityAtLevel, getMaxLevel } from '../services/escalationConfig.js';
import { sendEscalationEmail } from '../services/email.js';

/**
 * Dead Man's Switch Monitor
 * Runs every hour — checks for posts where admin hasn't responded
 * within the response window and auto-escalates to the next tier,
 * sending an email to the next authority in the chain.
 */
export function createDMSMonitor(pool, io) {
  return async function dmsCheck() {
    try {
      // Find escalated posts where deadline has passed with no response
      const result = await pool.query(`
        SELECT p.id, p.title, p.content, p.current_escalation_level,
          p.channel_id, p.upvote_count, p.urgency_score,
          c.category, c.name as channel_name
        FROM posts p
        JOIN channels c ON p.channel_id = c.id
        WHERE p.state IN ('escalated', 'resolution_rejected')
          AND p.response_deadline IS NOT NULL
          AND p.response_deadline < NOW()
          AND p.last_admin_response_at IS NULL
      `);

      for (const post of result.rows) {
        const newLevel = post.current_escalation_level + 1;
        const maxLevel = getMaxLevel(post.category);

        // Don't escalate beyond the max tier
        if (newLevel > maxLevel) {
          console.log(`⏰ DMS: Post ${post.id} already at max level ${maxLevel} for ${post.category} — skipping`);
          continue;
        }

        const nextAuthority = getAuthorityAtLevel(post.category, newLevel);
        if (!nextAuthority) {
          console.log(`⏰ DMS: No authority at level ${newLevel} for ${post.category} — skipping`);
          continue;
        }

        console.log(`⏰ DMS triggered: Post ${post.id} → Level ${newLevel} (${nextAuthority.role})`);

        try {
          // Transition state
          await transitionState(post.id, 'escalated', {
            escalationLevel: newLevel,
            responseWindowHours: nextAuthority.hours || 72,
          });

          // Log escalation
          await pool.query(`
            INSERT INTO escalations (post_id, level, trigger_type, notified_email)
            VALUES ($1, $2, 'dead_mans_switch', $3)
          `, [post.id, newLevel, nextAuthority.email]);

          // ── Send email to next-tier authority ─────────
          if (nextAuthority.email) {
            sendEscalationEmail({
              to: nextAuthority.email,
              roleTitle: nextAuthority.role,
              postTitle: post.title || 'Untitled',
              postContent: post.content || '',
              channelName: post.channel_name || post.category,
              category: post.category,
              upvoteCount: post.upvote_count || 0,
              urgencyScore: post.urgency_score || 0,
              escalationLevel: newLevel,
              postUrl: `/posts/${post.id}`,
              responseWindowHours: nextAuthority.hours || 'N/A (final tier)',
            }).catch(err => console.error(`  ❌ Email failed for post ${post.id}:`, err.message));
          }

          // ── In-app notification to assigned platform users ──
          const assignedAuthority = await pool.query(
            'SELECT user_id FROM authority_assignments WHERE category = $1 AND hierarchy_level = $2',
            [post.category, newLevel]
          );
          for (const auth of assignedAuthority.rows) {
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
              [auth.user_id, 'escalation', '⚠️ Escalated to you (auto)',
              `"${(post.title || '').substring(0, 80)}" was auto-escalated to your level after no response.`,
              `/posts/${post.id}`]
            );
            io.to(`user:${auth.user_id}`).emit('notification:new', {
              type: 'escalation', title: '⚠️ Escalated to you (auto)',
              message: `"${(post.title || '').substring(0, 80)}" was auto-escalated after no response.`,
              link: `/posts/${post.id}`,
            });
          }

          // Broadcast DMS trigger to post viewers
          io.to(`post:${post.id}`).emit('dms:triggered', {
            postId: post.id,
            newLevel,
            newState: 'escalated',
            role: nextAuthority.role,
            score: post.urgency_score,
          });

        } catch (err) {
          console.error(`  ❌ Failed to escalate post ${post.id}:`, err.message);
        }
      }

      if (result.rows.length > 0) {
        console.log(`⏰ DMS check complete: ${result.rows.length} post(s) reviewed`);
      }
    } catch (err) {
      console.error('❌ DMS Monitor error:', err.message);
    }
  };
}
