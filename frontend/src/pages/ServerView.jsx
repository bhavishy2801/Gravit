import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Hash, Lock, Settings, Users, X, Loader, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ServerView() {
    const { serverId, channelId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [server, setServer] = useState(null);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [channelDesc, setChannelDesc] = useState('');
    const [channelPrivate, setChannelPrivate] = useState(false);
    const [channelPassword, setChannelPassword] = useState('');
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchServer = useCallback(async () => {
        try {
            const [srvRes, chRes] = await Promise.all([
                api.get(`/servers/${serverId}`),
                api.get(`/servers/${serverId}/channels`),
            ]);
            setServer(srvRes.data.server);
            setChannels(chRes.data.channels || []);
        } catch (err) {
            console.error('Failed to load server:', err);
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    useEffect(() => {
        fetchServer();
    }, [fetchServer]);

    const fetchMembers = async () => {
        try {
            const res = await api.get(`/servers/${serverId}/members`);
            setMembers(res.data.members || []);
        } catch (err) {
            console.error('Failed to load members:', err);
        }
    };

    const handleCreateChannel = async () => {
        if (!channelName.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            await api.post(`/servers/${serverId}/channels`, {
                name: channelName.trim(),
                description: channelDesc.trim(),
                isPrivate: channelPrivate,
                password: channelPrivate ? channelPassword : undefined,
            });
            setShowCreateChannel(false);
            setChannelName('');
            setChannelDesc('');
            setChannelPrivate(false);
            setChannelPassword('');
            fetchServer();
        } catch (err) {
            setCreateError(err.response?.data?.error || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    const handleLeave = async () => {
        if (!window.confirm('Are you sure you want to leave this server?')) return;
        try {
            await api.post(`/servers/${serverId}/leave`);
            navigate('/channels/curriculum');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to leave server');
        }
    };

    const handleDeleteServer = async () => {
        if (!window.confirm('Are you sure you want to DELETE this server? This cannot be undone.')) return;
        try {
            await api.delete(`/servers/${serverId}`);
            navigate('/channels/curriculum');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete server');
        }
    };

    const handleDeleteChannel = async (chId) => {
        if (!window.confirm('Delete this channel?')) return;
        try {
            await api.delete(`/servers/${serverId}/channels/${chId}`);
            fetchServer();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete channel');
        }
    };

    const canManage = server && ['owner', 'admin', 'moderator'].includes(server.userRole);
    const isOwner = server?.userRole === 'owner';

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!server) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <p>Server not found</p>
            </div>
        );
    }

    const selectedChannel = channelId
        ? channels.find(c => c.id === channelId)
        : channels[0];

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#1a1b1e',
        }}>
            {/* Server header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: '#5865f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 800, color: '#fff',
                }}>
                    {server.icon || server.name?.slice(0, 2)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                        {server.name}
                    </h2>
                    {server.description && (
                        <p style={{ fontSize: '12px', color: '#949ba4', margin: 0 }}>{server.description}</p>
                    )}
                </div>

                <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => { fetchMembers(); setShowMembers(true); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        color: '#b5bac1', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '13px',
                    }}
                >
                    <Users size={18} /> {server.memberCount}
                </motion.button>

                {!isOwner && server.isMember && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={handleLeave}
                        title="Leave server"
                        style={{
                            color: '#da373c', background: 'none', border: 'none',
                            cursor: 'pointer', display: 'flex',
                        }}
                    >
                        <LogOut size={18} />
                    </motion.button>
                )}

                {isOwner && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={handleDeleteServer}
                        title="Delete server"
                        style={{
                            color: '#da373c', background: 'none', border: 'none',
                            cursor: 'pointer', display: 'flex',
                        }}
                    >
                        <Trash2 size={18} />
                    </motion.button>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* Channels list */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '12px',
                }}>
                    <span style={{
                        fontSize: '11px', fontWeight: 700, color: '#949ba4',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                        Channels — {channels.length}
                    </span>
                    {canManage && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => setShowCreateChannel(true)}
                            style={{
                                color: '#949ba4', background: 'none', border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                            }}
                        >
                            <Plus size={16} />
                        </motion.button>
                    )}
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    marginBottom: '32px',
                }}>
                    {channels.map(ch => (
                        <div
                            key={ch.id}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px', borderRadius: '6px',
                                background: selectedChannel?.id === ch.id ? '#35373c' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { if (selectedChannel?.id !== ch.id) e.currentTarget.style.background = '#2e3035'; }}
                            onMouseLeave={(e) => { if (selectedChannel?.id !== ch.id) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {ch.isPrivate ? <Lock size={16} color="#da373c" /> : <Hash size={16} color="#949ba4" />}
                            <span style={{ flex: 1, fontSize: '14px', color: '#f2f3f5', fontWeight: 500 }}>
                                {ch.name}
                            </span>
                            {ch.description && (
                                <span style={{ fontSize: '11px', color: '#949ba4' }}>{ch.description}</span>
                            )}
                            {canManage && channels.length > 1 && (
                                <motion.button
                                    whileHover={{ color: '#da373c' }}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                                    style={{
                                        color: '#949ba4', background: 'none', border: 'none',
                                        cursor: 'pointer', display: 'flex', opacity: 0.5,
                                    }}
                                >
                                    <Trash2 size={14} />
                                </motion.button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Welcome / Info */}
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: '#2b2d31',
                    borderRadius: '12px',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '20px',
                        background: '#5865f2', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', fontWeight: 800, color: '#fff',
                    }}>
                        {server.icon || server.name?.slice(0, 2)?.toUpperCase()}
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f2f3f5', marginBottom: '8px' }}>
                        Welcome to {server.name}!
                    </h2>
                    <p style={{ fontSize: '14px', color: '#949ba4', maxWidth: '400px', margin: '0 auto 16px' }}>
                        {server.description || 'This is the beginning of this server.'}
                    </p>
                    <div style={{
                        display: 'flex', gap: '12px', justifyContent: 'center',
                        fontSize: '13px', color: '#949ba4',
                    }}>
                        <span>{server.memberCount} members</span>
                        <span>·</span>
                        <span>{channels.length} channels</span>
                        <span>·</span>
                        <span>{server.isPublic ? 'Public' : 'Private'} server</span>
                    </div>
                </div>
            </div>

            {/* Create Channel Modal */}
            <AnimatePresence>
                {showCreateChannel && (
                    <>
                        <div
                            onClick={() => setShowCreateChannel(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '440px',
                                background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 9999, padding: '24px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                                    Create Channel
                                </h3>
                                <button
                                    onClick={() => setShowCreateChannel(false)}
                                    style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>
                                    Channel Name
                                </span>
                                <input
                                    value={channelName}
                                    onChange={(e) => setChannelName(e.target.value)}
                                    placeholder="e.g. announcements"
                                    style={{
                                        width: '100%', marginTop: '6px',
                                        padding: '10px 12px', background: '#1e1f22',
                                        border: '1px solid #3f4147', borderRadius: '6px',
                                        color: '#f2f3f5', fontSize: '14px', outline: 'none',
                                    }}
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>
                                    Description (optional)
                                </span>
                                <input
                                    value={channelDesc}
                                    onChange={(e) => setChannelDesc(e.target.value)}
                                    placeholder="What's this channel for?"
                                    style={{
                                        width: '100%', marginTop: '6px',
                                        padding: '10px 12px', background: '#1e1f22',
                                        border: '1px solid #3f4147', borderRadius: '6px',
                                        color: '#f2f3f5', fontSize: '14px', outline: 'none',
                                    }}
                                />
                            </label>

                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginBottom: '12px', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={channelPrivate}
                                    onChange={(e) => setChannelPrivate(e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: '#5865f2' }}
                                />
                                <Lock size={16} color="#da373c" />
                                <span style={{ fontSize: '14px', color: '#f2f3f5' }}>Private Channel</span>
                            </label>

                            {channelPrivate && (
                                <label style={{ display: 'block', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>
                                        Channel Password
                                    </span>
                                    <input
                                        type="password"
                                        value={channelPassword}
                                        onChange={(e) => setChannelPassword(e.target.value)}
                                        placeholder="Set a password"
                                        style={{
                                            width: '100%', marginTop: '6px',
                                            padding: '10px 12px', background: '#1e1f22',
                                            border: '1px solid #3f4147', borderRadius: '6px',
                                            color: '#f2f3f5', fontSize: '14px', outline: 'none',
                                        }}
                                    />
                                </label>
                            )}

                            {createError && (
                                <div style={{ fontSize: '13px', color: '#da373c', marginBottom: '12px' }}>
                                    {createError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowCreateChannel(false)}
                                    style={{
                                        padding: '8px 16px', background: 'transparent',
                                        color: '#b5bac1', border: 'none', borderRadius: '6px',
                                        fontSize: '14px', cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCreateChannel}
                                    disabled={creating || !channelName.trim()}
                                    style={{
                                        padding: '8px 20px', background: '#5865f2',
                                        color: '#fff', border: 'none', borderRadius: '6px',
                                        fontSize: '14px', fontWeight: 600,
                                        cursor: channelName.trim() ? 'pointer' : 'default',
                                        opacity: channelName.trim() ? 1 : 0.5,
                                    }}
                                >
                                    {creating ? 'Creating...' : 'Create Channel'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Members Modal */}
            <AnimatePresence>
                {showMembers && (
                    <>
                        <div
                            onClick={() => setShowMembers(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '400px',
                                background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 9999, maxHeight: '70vh',
                                overflow: 'hidden', display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                                    Members — {members.length}
                                </h3>
                                <button
                                    onClick={() => setShowMembers(false)}
                                    style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ overflowY: 'auto', padding: '8px 12px' }}>
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '8px', borderRadius: '6px',
                                        }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: `hsl(${member.avatarHue || 0}, 60%, 45%)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 700, color: '#fff',
                                        }}>
                                            {member.name?.slice(0, 2)?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#f2f3f5' }}>
                                                {member.name}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600,
                                            padding: '2px 8px', borderRadius: '10px',
                                            background: member.serverRole === 'owner' ? 'rgba(240,178,50,0.15)' :
                                                member.serverRole === 'admin' ? 'rgba(88,101,242,0.15)' :
                                                    member.serverRole === 'moderator' ? 'rgba(35,165,89,0.15)' :
                                                        'rgba(255,255,255,0.06)',
                                            color: member.serverRole === 'owner' ? '#f0b232' :
                                                member.serverRole === 'admin' ? '#5865f2' :
                                                    member.serverRole === 'moderator' ? '#23a559' :
                                                        '#949ba4',
                                        }}>
                                            {member.serverRole}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
