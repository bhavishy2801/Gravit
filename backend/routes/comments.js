import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { checkContent } from '../services/moderation.js';

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/comments/:postId — Get threaded comments
// ═══════════════════════════════════════════════════════
router.get('/:postId', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*,
        u.pseudonym as author,
        u.display_name as author_display_name,
        u.avatar_hue as author_avatar_hue
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.path
    `, [req.params.postId]);

    // Check user's upvotes on comments
    let userUpvotes = new Set();
    if (req.user) {
      const upvoteResult = await query(
        'SELECT comment_id FROM comment_upvotes WHERE user_id = $1',
        [req.user.id]
      );
      userUpvotes = new Set(upvoteResult.rows.map(r => r.comment_id));
    }

    const comments = result.rows.map(c => ({
      id: c.id,
      postId: c.post_id,
      author: c.author_display_name || c.author,
      authorId: c.author_id,
      authorAvatarHue: c.author_avatar_hue,
      content: c.content,
      path: c.path,
      depth: c.depth,
      parentId: c.parent_id,
      upvotes: c.upvote_count,
      upvoted: userUpvotes.has(c.id),
      createdAt: c.created_at,
    }));

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/comments/:postId — Add a comment
// ═══════════════════════════════════════════════════════
router.post('/:postId', authenticate, async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    const postId = req.params.postId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify post exists
    const postCheck = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // ── AI Content Moderation ────────────────────────
    const moderation = await checkContent(content);
    if (moderation.flagged) {
      return res.status(400).json({
        error: `Comment blocked by moderation: ${moderation.reason}`,
        categories: moderation.categories,
      });
    }

    // Build materialized path
    const commentId = uuidv4();
    let path, depth;

    if (parentId) {
      const parentResult = await query(
        'SELECT path, depth FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId]
      );
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Parent comment not found' });
      }
      path = `${parentResult.rows[0].path}/${commentId.substring(0, 4)}`;
      depth = parentResult.rows[0].depth + 1;
    } else {
      path = `root/${commentId.substring(0, 4)}`;
      depth = 1;
    }

    const result = await query(`
      INSERT INTO comments (id, post_id, author_id, content, path, depth, parent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [commentId, postId, req.user.id, content.trim(), path, depth, parentId || null]);

    // Update comment count
    await query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );

    // Notify post author about new comment
    const postInfo = await query('SELECT author_id, title FROM posts WHERE id = $1', [postId]);
    const postAuthorId = postInfo.rows[0]?.author_id;
    if (postAuthorId && postAuthorId !== req.user.id) {
      const postTitle = postInfo.rows[0].title.substring(0, 80);
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
        [postAuthorId, 'comment', 'New comment on your post', `Someone commented on "${postTitle}".`, `/posts/${postId}`]
      );
    }

    const comment = result.rows[0];
    const userResult = await query('SELECT pseudonym, avatar_hue FROM users WHERE id = $1', [req.user.id]);
    const author = userResult.rows[0];

    const commentData = {
      id: comment.id,
      postId: comment.post_id,
      author: author.pseudonym,
      authorAvatarHue: author.avatar_hue,
      content: comment.content,
      path: comment.path,
      depth: comment.depth,
      parentId: comment.parent_id,
      upvotes: 0,
      upvoted: false,
      createdAt: comment.created_at,
    };

    // Broadcast
    const io = req.app.get('io');
    io.to(`post:${postId}`).emit('comment:new', commentData);

    res.status(201).json({ comment: commentData });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/comments/:commentId/upvote — Toggle comment upvote
// ═══════════════════════════════════════════════════════
router.post('/:commentId/upvote', authenticate, async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const existing = await query(
      'SELECT 1 FROM comment_upvotes WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    if (existing.rows.length > 0) {
      await query('DELETE FROM comment_upvotes WHERE user_id = $1 AND comment_id = $2', [userId, commentId]);
      await query('UPDATE comments SET upvote_count = upvote_count - 1 WHERE id = $1', [commentId]);
    } else {
      await query('INSERT INTO comment_upvotes (user_id, comment_id) VALUES ($1, $2)', [userId, commentId]);
      await query('UPDATE comments SET upvote_count = upvote_count + 1 WHERE id = $1', [commentId]);
    }

    const result = await query('SELECT upvote_count FROM comments WHERE id = $1', [commentId]);

    res.json({
      upvoted: existing.rows.length === 0,
      upvoteCount: result.rows[0]?.upvote_count || 0,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/comments/:commentId — Delete a comment (author, moderator, or admin)
// ═══════════════════════════════════════════════════════
router.delete('/:commentId', authenticate, async (req, res, next) => {
  try {
    const commentId = req.params.commentId;

    // Fetch the comment to check ownership
    const commentResult = await query(
      'SELECT author_id, post_id FROM comments WHERE id = $1',
      [commentId]
    );
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = commentResult.rows[0];
    const isOwner = comment.author_id === req.user.id;
    const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Count this comment + its children for decrementing post comment_count
    const childCount = await query(
      `SELECT COUNT(*) as cnt FROM comments WHERE post_id = $1 AND path LIKE (SELECT path FROM comments WHERE id = $2) || '%'`,
      [comment.post_id, commentId]
    );
    const deleteCount = parseInt(childCount.rows[0].cnt);

    // Delete comment (children with matching path prefix will be orphaned, so delete them too)
    await query(
      `DELETE FROM comments WHERE id = $1 OR (post_id = $2 AND path LIKE (SELECT path FROM comments WHERE id = $1) || '/%')`,
      [commentId, comment.post_id]
    );

    // Update comment count on post
    await query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - $1, 0) WHERE id = $2',
      [deleteCount, comment.post_id]
    );

    // Broadcast
    const io = req.app.get('io');
    io.to(`post:${comment.post_id}`).emit('comment:deleted', { commentId });

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
