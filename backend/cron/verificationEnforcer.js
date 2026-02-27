import { transitionState } from '../services/stateMachine.js';

/**
 * Verification Poll Enforcer
 * Runs every 15 minutes — checks expired polls and finalizes outcomes
 */
export function createVerificationEnforcer(pool, io) {
  return async function verificationCheck() {
    try {
      // Find expired pending verifications
      const result = await pool.query(`
        SELECT rv.*, p.channel_id, c.category
        FROM resolution_verifications rv
        JOIN posts p ON rv.post_id = p.id
        JOIN channels c ON p.channel_id = c.id
        WHERE rv.outcome = 'pending'
          AND rv.deadline < NOW()
      `);

      for (const verification of result.rows) {
        const { post_id: postId, yes_count, no_count, total_votes } = verification;

        let outcome;
        if (total_votes === 0) {
          // No votes = auto-confirm (benefit of the doubt)
          outcome = 'confirmed';
        } else if (no_count > yes_count) {
          // >50% reject
          outcome = 'rejected';
        } else {
          // >50% confirm (or tie = confirm)
          outcome = 'confirmed';
        }

        console.log(`🔍 Verification poll expired for post ${postId}: ${outcome} (${yes_count} yes / ${no_count} no)`);

        // Update verification record
        await pool.query(
          'UPDATE resolution_verifications SET outcome = $1 WHERE id = $2',
          [outcome, verification.id]
        );

        try {
          if (outcome === 'confirmed') {
            // Transition to resolved
            await transitionState(postId, 'resolved');

            io.to(`post:${postId}`).emit('status:change', {
              postId,
              state: 'resolved',
              message: 'Resolution verified by students',
            });
          } else {
            // Transition to resolution_rejected
            await transitionState(postId, 'resolution_rejected');

            // Then re-escalate
            const postResult = await pool.query(
              'SELECT current_escalation_level FROM posts WHERE id = $1',
              [postId]
            );
            const currentLevel = postResult.rows[0]?.current_escalation_level || 1;

            const hierarchyResult = await pool.query(
              'SELECT response_window_hours FROM escalation_hierarchy WHERE category = $1 AND level = $2',
              [verification.category, currentLevel + 1]
            );
            const hours = hierarchyResult.rows[0]?.response_window_hours || 120;

            await transitionState(postId, 'escalated', {
              escalationLevel: currentLevel + 1,
              responseWindowHours: hours,
            });

            // Log escalation
            await pool.query(`
              INSERT INTO escalations (post_id, level, trigger_type)
              VALUES ($1, $2, 'resolution_rejected')
            `, [postId, currentLevel + 1]);

            io.to(`post:${postId}`).emit('status:change', {
              postId,
              state: 'resolution_rejected',
              message: `Resolution rejected by ${Math.round((no_count / total_votes) * 100)}% of voters. Re-escalating.`,
            });
          }
        } catch (err) {
          console.error(`  ❌ Failed to process verification for post ${postId}:`, err.message);
        }
      }

      if (result.rows.length > 0) {
        console.log(`🔍 Verification check complete: ${result.rows.length} poll(s) resolved`);
      }
    } catch (err) {
      console.error('❌ Verification Enforcer error:', err.message);
    }
  };
}
