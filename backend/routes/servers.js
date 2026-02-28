import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { checkContent } from '../services/moderation.js';

const router = Router();

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

    const result = await query(`
      INSERT INTO servers (name, description, icon, owner_id, is_public, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name.trim(), description.trim(), icon || name.trim().slice(0, 2).toUpperCase(), req.user.id, isPublic, passwordHash]);

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

    res.status(201).json({
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        icon: server.icon,
        isPublic: server.is_public,
        hasPassword: !!server.password_hash,
        memberCount: 1,
        userRole: 'owner',
        createdAt: server.created_at,
      },
    });
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

    // Cascades delete members and channels
    await query('DELETE FROM servers WHERE id = $1', [serverId]);

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

    res.status(201).json({
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.is_private,
        hasPassword: !!channel.password_hash,
        createdAt: channel.created_at,
      },
    });
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

    res.json({ message: 'Channel deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
