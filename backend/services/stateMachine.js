import { query } from '../config/database.js';

/**
 * Post State Machine
 * Valid transitions (forward-only):
 *   open → trending → escalated → pending_verification → resolved
 *                                                      → resolution_rejected → escalated (re-escalate)
 */
const VALID_TRANSITIONS = {
  open:                  ['trending'],
  trending:              ['escalated'],
  escalated:             ['pending_verification', 'escalated'], // escalated→escalated = DMS level-up
  pending_verification:  ['resolved', 'resolution_rejected'],
  resolution_rejected:   ['escalated'],                         // re-escalate
  resolved:              [],                                     // terminal
};

/**
 * Attempt a state transition. Returns true if successful.
 */
export async function transitionState(postId, newState, metadata = {}) {
  const result = await query('SELECT state, current_escalation_level FROM posts WHERE id = $1', [postId]);
  if (result.rows.length === 0) throw new Error('Post not found');

  const post = result.rows[0];
  const currentState = post.state;

  // Validate transition
  if (!VALID_TRANSITIONS[currentState]?.includes(newState)) {
    throw new Error(`Invalid transition: ${currentState} → ${newState}`);
  }

  const updates = { state: newState, updated_at: 'NOW()' };
  const params = [newState, postId];
  let paramIdx = 3;

  let sql = 'UPDATE posts SET state = $1, updated_at = NOW()';

  // State-specific side effects
  if (newState === 'escalated') {
    const newLevel = (metadata.escalationLevel !== undefined)
      ? metadata.escalationLevel
      : post.current_escalation_level + 1;

    sql += `, escalated_at = NOW(), current_escalation_level = $${paramIdx}`;
    params.push(newLevel);
    paramIdx++;

    // Set response deadline based on hierarchy
    if (metadata.responseWindowHours) {
      sql += `, response_deadline = NOW() + INTERVAL '${parseInt(metadata.responseWindowHours)} hours'`;
    } else {
      sql += `, response_deadline = NOW() + INTERVAL '72 hours'`;
    }
  }

  if (newState === 'pending_verification') {
    sql += `, last_admin_response_at = NOW()`;
    if (metadata.adminResponse) {
      sql += `, admin_response = $${paramIdx}`;
      params.push(metadata.adminResponse);
      paramIdx++;
    }
  }

  sql += ` WHERE id = $2 RETURNING *`;

  const updated = await query(sql, params);
  return updated.rows[0];
}

export { VALID_TRANSITIONS };
