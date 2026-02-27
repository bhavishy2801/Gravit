import { query } from '../config/database.js';

/**
 * Velocity-Weighted Urgency Scoring
 * S(t) = Σ e^(-λ * (t_now - t_i))
 *
 * λ = 0.05/hour — recent upvotes contribute ~1.0 weight,
 * 24h-old votes ~0.3, week-old votes ~0.0
 */
const LAMBDA = 0.05; // decay per hour

/**
 * Calculate urgency score for a post based on its upvote timestamps
 */
export async function calculateUrgencyScore(postId) {
  const result = await query(
    'SELECT created_at FROM upvotes WHERE post_id = $1',
    [postId]
  );

  const now = Date.now();
  let score = 0;

  for (const row of result.rows) {
    const hoursAgo = (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
    score += Math.exp(-LAMBDA * hoursAgo);
  }

  // Round to 2 decimal places
  score = Math.round(score * 100) / 100;

  // Update the post's urgency score
  await query(
    'UPDATE posts SET urgency_score = $1, updated_at = NOW() WHERE id = $2',
    [score, postId]
  );

  return score;
}

/**
 * Thresholds for state transitions
 */
export const THRESHOLDS = {
  T1_TRENDING: 15,     // Score >= 15 → trending
  T2_ESCALATED: 40,    // Score >= 40 → escalated
};
