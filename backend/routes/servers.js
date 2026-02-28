import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, transaction } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { checkContent } from '../services/moderation.js';

const router = Router();

// Generate a short invite code like "Ab3Xk9"
function generateInviteCode() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 8);
}

// ═══════════════════════════════════════════════════════
// GET /api/servers/mine — List servers the user has joined
// ═══════════════════════════════════════════════════════
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.*, sm.role as user_role
      FROM servers s
      JOIN server_members sm ON sm.server_id = s.id AND sm.user_id = $1
      ORDER BY sm.joined_at
    `, [req.user.id]);

    res.json({
      servers: result.rows.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        isPublic: s.is_public,
        hasPassword: !!s.password_hash,
        inviteCode: s.invite_code,
        memberCount: s.member_count,
        userRole: s.user_role,
        createdAt: s.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/explore — List public servers to join
// ═══════════════════════════════════════════════════════
router.get('/explore', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT s.*,
        CASE WHEN sm.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_member
      FROM servers s
      LEFT JOIN server_members sm ON sm.server_id = s.id AND sm.user_id = $1
      WHERE s.is_public = TRUE
    `;
    const params = [req.user.id];

    if (search && search.trim()) {
      sql += ` AND (s.name ILIKE $2 OR s.description ILIKE $2)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ' ORDER BY s.member_count DESC, s.created_at DESC LIMIT 50';

    const result = await query(sql, params);

    res.json({
      servers: result.rows.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        isPublic: s.is_public,
        hasPassword: !!s.password_hash,
        memberCount: s.member_count,
        isMember: s.is_member,
        createdAt: s.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id — Get server info
// ═══════════════════════════════════════════════════════
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM servers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const s = result.rows[0];

    // Check membership for role
    const memberCheck = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [s.id, req.user.id]
    );

    res.json({
      server: {
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        isPublic: s.is_public,
        hasPassword: !!s.password_hash,
        inviteCode: s.invite_code,
        memberCount: s.member_count,
        ownerId: s.owner_id,
        userRole: memberCheck.rows[0]?.role || null,
        isMember: memberCheck.rows.length > 0,
        createdAt: s.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers — Create a new server
// ═══════════════════════════════════════════════════════
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, description = '', icon = '', isPublic = true, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Server name must be at least 2 characters' });
    }

    // Moderation check
    const moderation = await checkContent(name + ' ' + description);
    if (moderation.flagged) {
      return res.status(400).json({
        error: `Content blocked by moderation: ${moderation.reason}`,
      });
    }

    let passwordHash = null;
    if (!isPublic && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const inviteCode = generateInviteCode();

    const result = await query(`
      INSERT INTO servers (name, description, icon, owner_id, is_public, password_hash, invite_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name.trim(), description.trim(), icon || name.trim().slice(0, 2).toUpperCase(), req.user.id, isPublic, passwordHash, inviteCode]);

    const server = result.rows[0];

    // Add creator as owner
    await query(
      'INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3)',
      [server.id, req.user.id, 'owner']
    );

    // Create a default "general" channel
    await query(
      'INSERT INTO server_channels (server_id, name, description) VALUES ($1, $2, $3)',
      [server.id, 'general', 'General discussion']
    );

    const serverData = {
      id: server.id,
      name: server.name,
      description: server.description,
      icon: server.icon,
      isPublic: server.is_public,
      hasPassword: !!server.password_hash,
      inviteCode: server.invite_code,
      memberCount: 1,
      userRole: 'owner',
      createdAt: server.created_at,
    };

    // Notify the creator's other sessions
    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('server:created', serverData);

    res.status(201).json({ server: serverData });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/join — Join a server
// ═══════════════════════════════════════════════════════
router.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { password } = req.body;

    const serverResult = await query('SELECT * FROM servers WHERE id = $1', [serverId]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const server = serverResult.rows[0];

    // Check if already a member
    const existing = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already a member of this server' });
    }

    // Check password for private servers
    if (!server.is_public && server.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required to join this server' });
      }
      const valid = await bcrypt.compare(password, server.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect server password' });
      }
    }

    await query(
      'INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3)',
      [serverId, req.user.id, 'member']
    );

    await query(
      'UPDATE servers SET member_count = member_count + 1 WHERE id = $1',
      [serverId]
    );

    // Get user info for broadcast
    const userResult = await query('SELECT pseudonym, display_name, avatar_hue FROM users WHERE id = $1', [req.user.id]);
    const u = userResult.rows[0];

    const io = req.app.get('io');
    // Notify the server room about new member
    io.to(`server:${serverId}`).emit('server:member-joined', {
      serverId,
      member: { id: req.user.id, name: u.display_name || u.pseudonym, avatarHue: u.avatar_hue, serverRole: 'member' },
    });
    // Notify the joining user's sessions to update server list
    io.to(`user:${req.user.id}`).emit('server:joined', { serverId, serverName: server.name });

    res.json({ message: 'Joined server successfully' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/leave — Leave a server
// ═══════════════════════════════════════════════════════
router.post('/:id/leave', authenticate, async (req, res, next) => {
  try {
    const serverId = req.params.id;

    // Check membership
    const memberCheck = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Not a member of this server' });
    }

    if (memberCheck.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Server owner cannot leave. Transfer ownership or delete the server.' });
    }

    await query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );

    await query(
      'UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
      [serverId]
    );

    const io = req.app.get('io');
    io.to(`server:${serverId}`).emit('server:member-left', { serverId, userId: req.user.id });
    io.to(`user:${req.user.id}`).emit('server:left', { serverId });

    res.json({ message: 'Left server successfully' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/servers/:id — Delete a server (owner only)
// ═══════════════════════════════════════════════════════
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const serverResult = await query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (serverResult.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the server owner can delete the server' });
    }

    // Get all member IDs before deleting to notify them
    const membersResult = await query('SELECT user_id FROM server_members WHERE server_id = $1', [serverId]);
    const memberIds = membersResult.rows.map(m => m.user_id);

    // Cascades delete members and channels
    await query('DELETE FROM servers WHERE id = $1', [serverId]);

    // Notify all members that the server was deleted
    const io = req.app.get('io');
    for (const uid of memberIds) {
      io.to(`user:${uid}`).emit('server:deleted', { serverId });
    }

    res.json({ message: 'Server deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// PUT /api/servers/:id/members/:userId/role — Update member role
// ═══════════════════════════════════════════════════════
router.put('/:id/members/:userId/role', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, userId: targetUserId } = req.params;
    const { role: newRole } = req.body;

    if (!['admin', 'moderator', 'member'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check requester is owner or admin
    const requesterMember = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (requesterMember.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    const requesterRole = requesterMember.rows[0].role;
    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      return res.status(403).json({ error: 'Only owner or admin can change roles' });
    }

    // Can't change owner role
    const targetMember = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, targetUserId]
    );
    if (targetMember.rows.length === 0) {
      return res.status(404).json({ error: 'User is not a member of this server' });
    }
    if (targetMember.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    // Admins can't promote to admin
    if (requesterRole === 'admin' && newRole === 'admin') {
      return res.status(403).json({ error: 'Only the owner can promote to admin' });
    }

    await query(
      'UPDATE server_members SET role = $1 WHERE server_id = $2 AND user_id = $3',
      [newRole, serverId, targetUserId]
    );

    const io = req.app.get('io');
    io.to(`server:${serverId}`).emit('server:member-role-changed', {
      serverId, userId: targetUserId, newRole,
    });

    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id/members — List server members
// ═══════════════════════════════════════════════════════
router.get('/:id/members', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.pseudonym, u.display_name, u.avatar_hue, u.role as global_role,
             sm.role as server_role, sm.joined_at
      FROM server_members sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.server_id = $1
      ORDER BY
        CASE sm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          ELSE 4
        END,
        sm.joined_at
    `, [req.params.id]);

    res.json({
      members: result.rows.map(m => ({
        id: m.id,
        name: m.display_name || m.pseudonym,
        avatarHue: m.avatar_hue,
        globalRole: m.global_role,
        serverRole: m.server_role,
        joinedAt: m.joined_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id/channels — List channels in a server
// ═══════════════════════════════════════════════════════
router.get('/:id/channels', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM server_channels
      WHERE server_id = $1
      ORDER BY sort_order, created_at
    `, [req.params.id]);

    res.json({
      channels: result.rows.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isPrivate: c.is_private,
        hasPassword: !!c.password_hash,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/channels — Create a channel in a server
// ═══════════════════════════════════════════════════════
router.post('/:id/channels', authenticate, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, description = '', isPrivate = false, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Channel name must be at least 2 characters' });
    }

    // Check requester is member with permission (owner, admin, moderator)
    const memberCheck = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    const role = memberCheck.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(role)) {
      return res.status(403).json({ error: 'Only owner, admin, or moderator can create channels' });
    }

    // Moderation check
    const moderation = await checkContent(name + ' ' + description);
    if (moderation.flagged) {
      return res.status(400).json({
        error: `Content blocked by moderation: ${moderation.reason}`,
      });
    }

    let passwordHash = null;
    if (isPrivate && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await query(`
      INSERT INTO server_channels (server_id, name, description, is_private, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [serverId, name.trim().toLowerCase().replace(/\s+/g, '-'), description.trim(), isPrivate, passwordHash]);

    const channel = result.rows[0];

    const channelData = {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.is_private,
      hasPassword: !!channel.password_hash,
      createdAt: channel.created_at,
    };

    // Broadcast to all server members
    const io = req.app.get('io');
    io.to(`server:${serverId}`).emit('server:channel-created', { serverId, channel: channelData });

    res.status(201).json({ channel: channelData });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/servers/:serverId/channels/:channelId — Delete a channel
// ═══════════════════════════════════════════════════════
router.delete('/:serverId/channels/:channelId', authenticate, async (req, res, next) => {
  try {
    const { serverId, channelId } = req.params;

    // Check permission
    const memberCheck = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return res.status(403).json({ error: 'Only owner or admin can delete channels' });
    }

    // Check channel count (must keep at least 1)
    const countResult = await query(
      'SELECT COUNT(*) as cnt FROM server_channels WHERE server_id = $1',
      [serverId]
    );
    if (parseInt(countResult.rows[0].cnt) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last channel in a server' });
    }

    await query(
      'DELETE FROM server_channels WHERE id = $1 AND server_id = $2',
      [channelId, serverId]
    );

    const io = req.app.get('io');
    io.to(`server:${serverId}`).emit('server:channel-deleted', { serverId, channelId });

    res.json({ message: 'Channel deleted' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/join-by-code — Join a server using invite code + password
// ═══════════════════════════════════════════════════════
router.post('/join-by-code', authenticate, async (req, res, next) => {
  try {
    const { inviteCode, password } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const serverResult = await query('SELECT * FROM servers WHERE UPPER(invite_code) = UPPER($1)', [inviteCode.trim()]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code. No server found.' });
    }

    const server = serverResult.rows[0];

    // Check if already a member
    const existing = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [server.id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this server', serverId: server.id });
    }

    // Private server: require password
    if (!server.is_public && server.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required for this private server' });
      }
      const valid = await bcrypt.compare(password, server.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect server password' });
      }
    }

    await query(
      'INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3)',
      [server.id, req.user.id, 'member']
    );
    await query(
      'UPDATE servers SET member_count = member_count + 1 WHERE id = $1',
      [server.id]
    );

    // Notify user's sessions + server members
    const io = req.app.get('io');
    io.to(`user:${req.user.id}`).emit('server:joined', { serverId: server.id, serverName: server.name });
    io.to(`server:${server.id}`).emit('server:member-joined', {
      serverId: server.id,
      member: { id: req.user.id },
    });

    res.json({
      message: 'Joined server successfully',
      serverId: server.id,
      serverName: server.name,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id/channels/:channelId/posts — List posts in a server channel
// ═══════════════════════════════════════════════════════
router.get('/:id/channels/:channelId/posts', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, channelId } = req.params;
    const { sort = 'newest' } = req.query;

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    let orderBy = 'sp.created_at DESC';
    if (sort === 'oldest') orderBy = 'sp.created_at ASC';
    if (sort === 'replies') orderBy = 'sp.reply_count DESC, sp.created_at DESC';

    const result = await query(`
      SELECT sp.*, u.pseudonym as author, u.display_name as author_display_name,
             u.avatar_hue as author_avatar_hue
      FROM server_posts sp
      JOIN users u ON sp.author_id = u.id
      WHERE sp.server_id = $1 AND sp.channel_id = $2
      ORDER BY ${orderBy}
      LIMIT 100
    `, [serverId, channelId]);

    res.json({
      posts: result.rows.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        authorId: p.author_id,
        author: p.author_display_name || p.author,
        authorAvatarHue: p.author_avatar_hue,
        replyCount: p.reply_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/channels/:channelId/posts — Create a post in a server channel
// ═══════════════════════════════════════════════════════
router.post('/:id/channels/:channelId/posts', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, channelId } = req.params;
    const { title, content } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    // Moderation
    const moderation = await checkContent(title + ' ' + content);
    if (moderation.flagged) {
      return res.status(400).json({ error: `Content blocked: ${moderation.reason}` });
    }

    const result = await query(`
      INSERT INTO server_posts (server_id, channel_id, author_id, title, content)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [serverId, channelId, req.user.id, title.trim(), content.trim()]);

    const post = result.rows[0];

    // Get author info for broadcast
    const userResult = await query('SELECT pseudonym, display_name, avatar_hue FROM users WHERE id = $1', [req.user.id]);
    const u = userResult.rows[0];

    const postData = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: u.display_name || u.pseudonym,
      authorAvatarHue: u.avatar_hue,
      replyCount: 0,
      createdAt: post.created_at,
    };

    // Broadcast to channel viewers
    const io = req.app.get('io');
    io.to(`server-channel:${channelId}`).emit('server:post-created', { channelId, post: postData });

    res.status(201).json({ post: postData });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id/posts/:postId — Get a single server post with replies
// ═══════════════════════════════════════════════════════
router.get('/:id/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, postId } = req.params;

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    const postResult = await query(`
      SELECT sp.*, u.pseudonym as author, u.display_name as author_display_name,
             u.avatar_hue as author_avatar_hue
      FROM server_posts sp
      JOIN users u ON sp.author_id = u.id
      WHERE sp.id = $1 AND sp.server_id = $2
    `, [postId, serverId]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const p = postResult.rows[0];

    // Get replies
    const repliesResult = await query(`
      SELECT r.*, u.pseudonym as author, u.display_name as author_display_name,
             u.avatar_hue as author_avatar_hue
      FROM server_post_replies r
      JOIN users u ON r.author_id = u.id
      WHERE r.post_id = $1
      ORDER BY r.created_at ASC
    `, [postId]);

    res.json({
      post: {
        id: p.id,
        title: p.title,
        content: p.content,
        authorId: p.author_id,
        author: p.author_display_name || p.author,
        authorAvatarHue: p.author_avatar_hue,
        replyCount: p.reply_count,
        createdAt: p.created_at,
      },
      replies: repliesResult.rows.map(r => ({
        id: r.id,
        content: r.content,
        authorId: r.author_id,
        author: r.author_display_name || r.author,
        authorAvatarHue: r.author_avatar_hue,
        parentReplyId: r.parent_reply_id,
        depth: r.depth,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/posts/:postId/replies — Reply to a server post
// ═══════════════════════════════════════════════════════
router.post('/:id/posts/:postId/replies', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, postId } = req.params;
    const { content, parentReplyId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    // Moderation
    const moderation = await checkContent(content);
    if (moderation.flagged) {
      return res.status(400).json({ error: `Content blocked: ${moderation.reason}` });
    }

    let depth = 0;
    if (parentReplyId) {
      const parentResult = await query('SELECT depth FROM server_post_replies WHERE id = $1', [parentReplyId]);
      if (parentResult.rows.length > 0) {
        depth = parentResult.rows[0].depth + 1;
      }
    }

    const result = await query(`
      INSERT INTO server_post_replies (post_id, author_id, content, parent_reply_id, depth)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [postId, req.user.id, content.trim(), parentReplyId || null, depth]);

    // Increment reply count
    await query('UPDATE server_posts SET reply_count = reply_count + 1 WHERE id = $1', [postId]);

    const r = result.rows[0];

    // Get author info
    const userResult = await query('SELECT pseudonym, display_name, avatar_hue FROM users WHERE id = $1', [req.user.id]);
    const u = userResult.rows[0];

    const replyData = {
      id: r.id,
      content: r.content,
      authorId: r.author_id,
      author: u.display_name || u.pseudonym,
      authorAvatarHue: u.avatar_hue,
      parentReplyId: r.parent_reply_id,
      depth: r.depth,
      createdAt: r.created_at,
    };

    // Broadcast to thread viewers
    const io = req.app.get('io');
    io.to(`server-post:${postId}`).emit('server:reply-created', { postId, reply: replyData });

    res.status(201).json({ reply: replyData });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/servers/:id/posts/:postId — Delete a server post (author or admin)
// ═══════════════════════════════════════════════════════
router.delete('/:id/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, postId } = req.params;

    const postResult = await query('SELECT author_id FROM server_posts WHERE id = $1 AND server_id = $2', [postId, serverId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const memberCheck = await query(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );

    const isAuthor = postResult.rows[0].author_id === req.user.id;
    const isManager = ['owner', 'admin', 'moderator'].includes(memberCheck.rows[0]?.role);

    if (!isAuthor && !isManager) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Get channel_id before deleting for broadcast
    const postInfo = await query('SELECT channel_id FROM server_posts WHERE id = $1', [postId]);
    const channelId = postInfo.rows[0]?.channel_id;

    await query('DELETE FROM server_posts WHERE id = $1', [postId]);

    const io = req.app.get('io');
    if (channelId) {
      io.to(`server-channel:${channelId}`).emit('server:post-deleted', { postId, channelId });
    }

    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/servers/:id/channels/:channelId/messages — Get chat messages
// ═══════════════════════════════════════════════════════
router.get('/:id/channels/:channelId/messages', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, channelId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    let sql = `
      SELECT m.*, u.pseudonym as author, u.display_name as author_display_name,
             u.avatar_hue as author_avatar_hue
      FROM server_chat_messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.server_id = $1 AND m.channel_id = $2
    `;
    const params = [serverId, channelId];

    if (before) {
      sql += ` AND m.created_at < $3 ORDER BY m.created_at DESC LIMIT $4`;
      params.push(before, Math.min(parseInt(limit), 100));
    } else {
      sql += ` ORDER BY m.created_at DESC LIMIT $3`;
      params.push(Math.min(parseInt(limit), 100));
    }

    const result = await query(sql, params);

    res.json({
      messages: result.rows.reverse().map(m => ({
        id: m.id,
        content: m.content,
        authorId: m.author_id,
        author: m.author_display_name || m.author,
        authorAvatarHue: m.author_avatar_hue,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/servers/:id/channels/:channelId/messages — Send a chat message
// ═══════════════════════════════════════════════════════
router.post('/:id/channels/:channelId/messages', authenticate, async (req, res, next) => {
  try {
    const { id: serverId, channelId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify membership
    const memberCheck = await query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    // Moderation
    const moderation = await checkContent(content);
    if (moderation.flagged) {
      return res.status(400).json({ error: `Message blocked: ${moderation.reason}` });
    }

    const result = await query(`
      INSERT INTO server_chat_messages (server_id, channel_id, author_id, content)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [serverId, channelId, req.user.id, content.trim()]);

    const msg = result.rows[0];

    // Get author info
    const userResult = await query(
      'SELECT pseudonym, display_name, avatar_hue FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = userResult.rows[0];

    const message = {
      id: msg.id,
      content: msg.content,
      authorId: msg.author_id,
      author: u.display_name || u.pseudonym,
      authorAvatarHue: u.avatar_hue,
      createdAt: msg.created_at,
    };

    // Broadcast via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`server-channel:${channelId}`).emit('chat:message', message);
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

export default router;
