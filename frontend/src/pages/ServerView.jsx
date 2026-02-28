import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Hash, Lock, Users, X, Loader, LogOut, Trash2,
    Send, MessageCircle, Copy, Check, Key
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

export default function ServerView() {
    const { serverId, channelId: urlChannelId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [server, setServer] = useState(null);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Channel creation modal
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [channelDesc, setChannelDesc] = useState('');
    const [channelPrivate, setChannelPrivate] = useState(false);
    const [channelPassword, setChannelPassword] = useState('');
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);

    // Members modal
    const [showMembers, setShowMembers] = useState(false);

    // Active channel & posts
    const [activeChannelId, setActiveChannelId] = useState(urlChannelId || null);
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);

    // Create post
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postError, setPostError] = useState('');
    const [postSubmitting, setPostSubmitting] = useState(false);

    // Thread view
    const [activePost, setActivePost] = useState(null);
    const [replies, setReplies] = useState([]);
    const [replyContent, setReplyContent] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [threadLoading, setThreadLoading] = useState(false);

    // Invite code copy
    const [copied, setCopied] = useState(false);

    // Role change
    const [roleLoading, setRoleLoading] = useState(null);

    // View mode: 'chat' or 'threads'
    const [viewMode, setViewMode] = useState('chat');

    // Chat messages
    const [chatMessages, setChatMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const { joinServerChannel, leaveServerChannel, joinServerPost, leaveServerPost, emitTypingStart, emitTypingStop, on, off } = useSocket();

    // Typing indicator state
    const [typingUsers, setTypingUsers] = useState({}); // { [userId]: pseudonym }
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);

    const fetchServer = useCallback(async () => {
        try {
            const [srvRes, chRes] = await Promise.all([
                api.get(`/servers/${serverId}`),
                api.get(`/servers/${serverId}/channels`),
            ]);
            setServer(srvRes.data.server);
            setChannels(chRes.data.channels || []);
            if (!activeChannelId && chRes.data.channels?.length > 0) {
                setActiveChannelId(chRes.data.channels[0].id);
            }
        } catch (err) {
            console.error('Failed to load server:', err);
        } finally {
            setLoading(false);
        }
    }, [serverId]);

    useEffect(() => { fetchServer(); }, [fetchServer]);

    // Listen for server-wide real-time events (ChannelSidebar manages the room join)
    useEffect(() => {
        if (!serverId) return;

        const handleChannelCreated = ({ channel }) => {
            setChannels(prev => [...prev, channel]);
        };
        const handleChannelDeleted = ({ channelId }) => {
            setChannels(prev => prev.filter(c => c.id !== parseInt(channelId) && c.id !== channelId));
        };
        const handleMemberJoined = () => fetchServer();
        const handleMemberLeft = () => fetchServer();
        const handleMemberRoleChanged = () => fetchServer();

        on('server:channel-created', handleChannelCreated);
        on('server:channel-deleted', handleChannelDeleted);
        on('server:member-joined', handleMemberJoined);
        on('server:member-left', handleMemberLeft);
        on('server:member-role-changed', handleMemberRoleChanged);

        return () => {
            off('server:channel-created', handleChannelCreated);
            off('server:channel-deleted', handleChannelDeleted);
            off('server:member-joined', handleMemberJoined);
            off('server:member-left', handleMemberLeft);
            off('server:member-role-changed', handleMemberRoleChanged);
        };
    }, [serverId, on, off, fetchServer]);

    const fetchPosts = useCallback(async () => {
        if (!activeChannelId) return;
        setPostsLoading(true);
        try {
            const res = await api.get(`/servers/${serverId}/channels/${activeChannelId}/posts`);
            setPosts(res.data.posts || []);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setPostsLoading(false);
        }
    }, [serverId, activeChannelId]);

    useEffect(() => {
        fetchPosts();
        setActivePost(null);
        setReplies([]);
    }, [fetchPosts]);

    // Chat: fetch messages when channel changes
    const fetchChatMessages = useCallback(async () => {
        if (!activeChannelId) return;
        setChatLoading(true);
        try {
            const res = await api.get(`/servers/${serverId}/channels/${activeChannelId}/messages`);
            setChatMessages(res.data.messages || []);
        } catch (err) {
            console.error('Failed to load chat:', err);
        } finally {
            setChatLoading(false);
        }
    }, [serverId, activeChannelId]);

    useEffect(() => {
        fetchChatMessages();
    }, [fetchChatMessages]);

    // Chat: scroll to bottom when new messages arrive
    useEffect(() => {
        if (viewMode === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, viewMode]);

    // Chat: socket.io join/leave channel room & listen for messages + typing
    useEffect(() => {
        if (!activeChannelId) return;
        joinServerChannel(activeChannelId);

        const handleNewMessage = (msg) => {
            setChatMessages(prev => [...prev, msg]);
        };
        on('chat:message', handleNewMessage);

        // Typing indicators (use == for type-safe comparison: channelId may be number or string)
        const handleTypingStart = ({ channelId, userId, pseudonym }) => {
            if (String(channelId) !== String(activeChannelId)) return;
            setTypingUsers(prev => ({ ...prev, [userId]: pseudonym }));
            // Auto-clear after 4s in case stop event is lost
            setTimeout(() => {
                setTypingUsers(prev => {
                    const next = { ...prev };
                    delete next[userId];
                    return next;
                });
            }, 4000);
        };
        const handleTypingStop = ({ channelId, userId }) => {
            if (String(channelId) !== String(activeChannelId)) return;
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        };
        on('typing:start', handleTypingStart);
        on('typing:stop', handleTypingStop);

        // Thread post events (broadcast on same channel room)
        const handleServerPostCreated = ({ post: newPost }) => {
            setPosts(prev => [newPost, ...prev]);
        };
        const handleServerPostDeleted = ({ postId }) => {
            setPosts(prev => prev.filter(p => p.id !== postId && p.id !== parseInt(postId)));
            setActivePost(prev => prev?.id === postId || prev?.id === parseInt(postId) ? null : prev);
        };
        on('server:post-created', handleServerPostCreated);
        on('server:post-deleted', handleServerPostDeleted);

        return () => {
            leaveServerChannel(activeChannelId);
            off('chat:message', handleNewMessage);
            off('typing:start', handleTypingStart);
            off('typing:stop', handleTypingStop);
            off('server:post-created', handleServerPostCreated);
            off('server:post-deleted', handleServerPostDeleted);
            setTypingUsers({});
        };
    }, [activeChannelId, joinServerChannel, leaveServerChannel, on, off]);

    const handleSendChat = async () => {
        if (!chatInput.trim() || chatSending) return;
        setChatSending(true);
        // Stop typing indicator
        if (isTypingRef.current) {
            emitTypingStop(activeChannelId);
            isTypingRef.current = false;
            clearTimeout(typingTimerRef.current);
        }
        try {
            await api.post(`/servers/${serverId}/channels/${activeChannelId}/messages`, {
                content: chatInput.trim(),
            });
            setChatInput('');
            // Message will arrive via socket broadcast
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to send message');
        } finally {
            setChatSending(false);
        }
    };

    const handleChatInputChange = (e) => {
        setChatInput(e.target.value);
        if (!activeChannelId) return;
        // Debounced typing emit
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            emitTypingStart(activeChannelId);
        }
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            emitTypingStop(activeChannelId);
        }, 2000);
    };

    const fetchMembers = async () => {
        try {
            const res = await api.get(`/servers/${serverId}/members`);
            setMembers(res.data.members || []);
        } catch (err) {
            console.error('Failed to load members:', err);
        }
    };

    const openThread = async (post) => {
        setActivePost(post);
        setThreadLoading(true);
        try {
            const res = await api.get(`/servers/${serverId}/posts/${post.id}`);
            setActivePost(res.data.post);
            setReplies(res.data.replies || []);
        } catch (err) {
            console.error('Failed to load thread:', err);
        } finally {
            setThreadLoading(false);
        }
    };

    // Real-time: listen for new replies on the active thread
    useEffect(() => {
        if (!activePost?.id) return;
        joinServerPost(activePost.id);

        const handleReplyCreated = ({ reply }) => {
            setReplies(prev => [...prev, reply]);
            // Update reply count on the post in the list
            setPosts(prev => prev.map(p =>
                p.id === activePost.id ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p
            ));
        };

        on('server:reply-created', handleReplyCreated);

        return () => {
            leaveServerPost(activePost.id);
            off('server:reply-created', handleReplyCreated);
        };
    }, [activePost?.id, joinServerPost, leaveServerPost, on, off]);

    const handleCreatePost = async () => {
        if (!postTitle.trim() || !postContent.trim()) return;
        setPostSubmitting(true);
        setPostError('');
        try {
            await api.post(`/servers/${serverId}/channels/${activeChannelId}/posts`, {
                title: postTitle.trim(), content: postContent.trim(),
            });
            setShowCreatePost(false);
            setPostTitle('');
            setPostContent('');
            fetchPosts();
        } catch (err) {
            setPostError(err.response?.data?.error || 'Failed to create post');
        } finally {
            setPostSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!replyContent.trim() || !activePost) return;
        setReplySubmitting(true);
        try {
            await api.post(`/servers/${serverId}/posts/${activePost.id}/replies`, {
                content: replyContent.trim(),
            });
            setReplyContent('');
            const res = await api.get(`/servers/${serverId}/posts/${activePost.id}`);
            setActivePost(res.data.post);
            setReplies(res.data.replies || []);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reply');
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await api.delete(`/servers/${serverId}/posts/${postId}`);
            if (activePost?.id === postId) { setActivePost(null); setReplies([]); }
            fetchPosts();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete post');
        }
    };

    const handleCreateChannel = async () => {
        if (!channelName.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            await api.post(`/servers/${serverId}/channels`, {
                name: channelName.trim(), description: channelDesc.trim(),
                isPrivate: channelPrivate, password: channelPrivate ? channelPassword : undefined,
            });
            setShowCreateChannel(false);
            setChannelName(''); setChannelDesc(''); setChannelPrivate(false); setChannelPassword('');
            fetchServer();
        } catch (err) {
            setCreateError(err.response?.data?.error || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteChannel = async (chId) => {
        if (!window.confirm('Delete this channel and all its posts?')) return;
        try {
            await api.delete(`/servers/${serverId}/channels/${chId}`);
            if (activeChannelId === chId) setActiveChannelId(null);
            fetchServer();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete channel');
        }
    };

    const handleLeave = async () => {
        if (!window.confirm('Leave this server?')) return;
        try {
            await api.post(`/servers/${serverId}/leave`);
            navigate('/channels/curriculum');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to leave server');
        }
    };

    const handleDeleteServer = async () => {
        if (!window.confirm('DELETE this server permanently?')) return;
        try {
            await api.delete(`/servers/${serverId}`);
            navigate('/channels/curriculum');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete server');
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        setRoleLoading(memberId);
        try {
            await api.put(`/servers/${serverId}/members/${memberId}/role`, { role: newRole });
            fetchMembers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to change role');
        } finally {
            setRoleLoading(null);
        }
    };

    const copyInviteCode = () => {
        if (server?.inviteCode) {
            navigator.clipboard.writeText(server.inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const canManage = server && ['owner', 'admin', 'moderator'].includes(server.userRole);
    const isOwner = server?.userRole === 'owner';
    const isAdminOrAbove = server && ['owner', 'admin'].includes(server.userRole);
    const activeChannel = channels.find(c => c.id === activeChannelId);

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!server) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4', flexDirection: 'column', gap: '12px' }}>
                <p>Server not found or you are not a member.</p>
            </div>
        );
    }

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#1a1b1e' }}>
            {/* ═══ Left: Channel sidebar inside server ═══ */}
            <div style={{
                width: '220px', minWidth: '220px',
                background: '#141517', borderRight: '1px solid #0d0e10',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Server header */}
                <div style={{
                    padding: '12px', borderBottom: '1px solid #0d0e10',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                        {server.icon || server.name?.slice(0, 2)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f2f3f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {server.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#949ba4' }}>
                            {server.memberCount} members
                        </div>
                    </div>
                </div>

                {/* Invite code bar */}
                <div style={{
                    padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <Key size={12} color="#949ba4" />
                    <span style={{ fontSize: '11px', color: '#949ba4', flex: 1, fontFamily: 'monospace' }}>
                        {server.inviteCode || 'N/A'}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={copyInviteCode}
                        style={{ color: copied ? '#23a559' : '#949ba4', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                        title="Copy invite code"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </motion.button>
                </div>

                {/* Channel list header */}
                <div style={{
                    padding: '10px 12px 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#949ba4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Channels
                    </span>
                    {canManage && (
                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowCreateChannel(true)}
                            style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <Plus size={14} />
                        </motion.button>
                    )}
                </div>

                {/* Channels */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                    {channels.map(ch => {
                        const active = ch.id === activeChannelId;
                        return (
                            <motion.button
                                key={ch.id}
                                onClick={() => setActiveChannelId(ch.id)}
                                whileHover={{ backgroundColor: '#2e3035' }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 8px', borderRadius: '4px', marginBottom: '2px',
                                    fontSize: '14px', fontWeight: active ? 600 : 400,
                                    color: active ? '#f2f3f5' : '#949ba4',
                                    background: active ? '#35373c' : 'transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                }}
                            >
                                {ch.isPrivate ? <Lock size={14} color="#da373c" /> : <Hash size={14} />}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ch.name}
                                </span>
                                {canManage && channels.length > 1 && (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                                        style={{ opacity: 0.3, display: 'flex', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.3'}
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Server actions */}
                <div style={{ padding: '8px', borderTop: '1px solid #0d0e10', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                        onClick={() => { fetchMembers(); setShowMembers(true); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 8px', borderRadius: '4px', fontSize: '13px',
                            color: '#b5bac1', background: 'none', border: 'none', cursor: 'pointer',
                            width: '100%', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2e3035'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <Users size={14} /> Members ({server.memberCount})
                    </button>
                    {!isOwner && server.isMember && (
                        <button onClick={handleLeave}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', fontSize: '13px', color: '#da373c', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2e3035'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={14} /> Leave Server
                        </button>
                    )}
                    {isOwner && (
                        <button onClick={handleDeleteServer}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', fontSize: '13px', color: '#da373c', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2e3035'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> Delete Server
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ Center: Channel feed — Chat / Threads tabs ═══ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Channel header + tabs */}
                <div style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    minHeight: '48px',
                }}>
                    <div style={{
                        padding: '8px 20px 0',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        {activeChannel ? (
                            <>
                                {activeChannel.isPrivate ? <Lock size={18} color="#da373c" /> : <Hash size={18} color="#949ba4" />}
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5' }}>
                                    {activeChannel.name}
                                </span>
                                {activeChannel.description && (
                                    <>
                                        <div style={{ width: '1px', height: '20px', background: '#3f4147', margin: '0 8px' }} />
                                        <span style={{ fontSize: '13px', color: '#949ba4' }}>{activeChannel.description}</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <span style={{ fontSize: '14px', color: '#949ba4' }}>Select a channel</span>
                        )}
                        <div style={{ flex: 1 }} />
                        {activeChannel && viewMode === 'threads' && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowCreatePost(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '4px',
                                    background: '#5865f2', color: '#fff',
                                    fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
                                }}
                            >
                                <Plus size={14} /> New Thread
                            </motion.button>
                        )}
                    </div>
                    {/* Tabs */}
                    {activeChannel && (
                        <div style={{ display: 'flex', gap: '0', padding: '0 20px', marginTop: '8px' }}>
                            {['chat', 'threads'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setViewMode(tab)}
                                    style={{
                                        padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                                        color: viewMode === tab ? '#f2f3f5' : '#949ba4',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        borderBottom: viewMode === tab ? '2px solid #5865f2' : '2px solid transparent',
                                        textTransform: 'capitalize',
                                        transition: 'color 0.15s, border-color 0.15s',
                                    }}
                                >
                                    {tab === 'chat' ? <><Send size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Chat</> : <><MessageCircle size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Threads</>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Chat view ─── */}
                {viewMode === 'chat' && activeChannel && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Messages */}
                        <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            {chatLoading && (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#949ba4' }}>
                                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            )}
                            {!chatLoading && chatMessages.length === 0 && (
                                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#949ba4' }}>
                                    <Send size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#f2f3f5', marginBottom: '4px' }}>
                                        No messages yet
                                    </p>
                                    <p style={{ fontSize: '13px' }}>
                                        Be the first to say something in #{activeChannel.name}!
                                    </p>
                                </div>
                            )}
                            {chatMessages.map((msg, idx) => {
                                const prevMsg = chatMessages[idx - 1];
                                const msgDate = new Date(msg.createdAt);
                                const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                                const showDateSep = !prevDate ||
                                    msgDate.toDateString() !== prevDate.toDateString();
                                const sameAuthor = prevMsg && prevMsg.authorId === msg.authorId && !showDateSep;
                                const withinMinute = prevMsg && (msgDate - prevDate) < 60000;
                                const grouped = sameAuthor && withinMinute;

                                // Date label: "Today", "Yesterday", or "Feb 27, 2025"
                                let dateLabel = '';
                                if (showDateSep) {
                                    const today = new Date();
                                    const yesterday = new Date();
                                    yesterday.setDate(today.getDate() - 1);
                                    if (msgDate.toDateString() === today.toDateString()) {
                                        dateLabel = 'Today';
                                    } else if (msgDate.toDateString() === yesterday.toDateString()) {
                                        dateLabel = 'Yesterday';
                                    } else {
                                        dateLabel = msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                    }
                                }

                                return (
                                    <div key={msg.id}>
                                    {showDateSep && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            margin: '16px 0 8px',
                                        }}>
                                            <div style={{ flex: 1, height: '1px', background: '#3f4147' }} />
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700, color: '#949ba4',
                                                padding: '2px 8px', background: '#2b2d31', borderRadius: '8px',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {dateLabel}
                                            </span>
                                            <div style={{ flex: 1, height: '1px', background: '#3f4147' }} />
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex', gap: '10px',
                                        marginTop: grouped ? '2px' : '12px',
                                        padding: '2px 8px', borderRadius: '4px',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Avatar or spacer */}
                                        <div style={{ width: '36px', flexShrink: 0 }}>
                                            {!grouped && (
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: `hsl(${msg.authorAvatarHue || 0}, 60%, 45%)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '12px', fontWeight: 700, color: '#fff',
                                                }}>
                                                    {msg.author?.slice(0, 2)?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {!grouped && (
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5' }}>
                                                        {msg.author}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#949ba4' }}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                            <p style={{
                                                fontSize: '14px', color: '#dcddde', lineHeight: 1.4,
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                                            }}>
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Typing indicator */}
                        {(() => {
                            const names = Object.values(typingUsers);
                            if (names.length === 0) return null;
                            const text = names.length === 1
                                ? `${names[0]} is typing...`
                                : names.length === 2
                                    ? `${names[0]} and ${names[1]} are typing...`
                                    : `${names[0]} and ${names.length - 1} others are typing...`;
                            return (
                                <div style={{
                                    padding: '2px 20px 0', fontSize: '12px', color: '#949ba4',
                                    fontStyle: 'italic', height: '18px',
                                }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    }}>
                                        <span style={{
                                            display: 'inline-flex', gap: '2px',
                                        }}>
                                            {[0,1,2].map(i => (
                                                <span key={i} style={{
                                                    width: '4px', height: '4px', borderRadius: '50%',
                                                    background: '#949ba4', display: 'inline-block',
                                                    animation: `typingBounce 1.2s ${i * 0.2}s infinite`,
                                                }} />
                                            ))}
                                        </span>
                                        {text}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Chat input */}
                        <div style={{
                            padding: '0 16px 16px',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'flex-end', gap: '8px',
                                background: '#2b2d31', borderRadius: '8px', padding: '4px 4px 4px 16px',
                            }}>
                                <textarea
                                    value={chatInput}
                                    onChange={handleChatInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendChat();
                                        }
                                    }}
                                    placeholder={`Message #${activeChannel.name}`}
                                    rows={1}
                                    style={{
                                        flex: 1, padding: '8px 0', background: 'transparent',
                                        border: 'none', color: '#f2f3f5', fontSize: '14px',
                                        outline: 'none', resize: 'none',
                                        minHeight: '20px', maxHeight: '120px',
                                        fontFamily: 'inherit', lineHeight: 1.4,
                                    }}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleSendChat}
                                    disabled={chatSending || !chatInput.trim()}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '6px',
                                        background: chatInput.trim() ? '#5865f2' : 'transparent',
                                        color: chatInput.trim() ? '#fff' : '#949ba4',
                                        border: 'none',
                                        cursor: chatInput.trim() ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Send size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Threads view ─── */}
                {viewMode === 'threads' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
                        {postsLoading && (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#949ba4' }}>
                                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        )}

                        {!postsLoading && posts.length === 0 && activeChannel && (
                            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#949ba4' }}>
                                <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p style={{ fontSize: '15px', fontWeight: 600, color: '#f2f3f5', marginBottom: '4px' }}>
                                    No threads yet
                                </p>
                                <p style={{ fontSize: '13px' }}>
                                    Start a discussion in #{activeChannel.name}
                                </p>
                            </div>
                        )}

                        {!postsLoading && posts.map((post) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => openThread(post)}
                                style={{
                                    padding: '12px 16px', borderRadius: '8px',
                                    background: activePost?.id === post.id ? '#2e3035' : '#1e1f22',
                                    marginBottom: '6px', cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (activePost?.id !== post.id) e.currentTarget.style.background = '#252729'; }}
                                onMouseLeave={e => { if (activePost?.id !== post.id) e.currentTarget.style.background = '#1e1f22'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: `hsl(${post.authorAvatarHue || 0}, 60%, 45%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '10px', fontWeight: 700, color: '#fff',
                                    }}>
                                        {post.author?.slice(0, 2)?.toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f2f3f5' }}>{post.author}</span>
                                    <span style={{ fontSize: '11px', color: '#949ba4' }}>{timeAgo(post.createdAt)}</span>
                                    <div style={{ flex: 1 }} />
                                    {(post.authorId === user?.id || canManage) && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                            style={{ color: '#949ba4', opacity: 0.4, cursor: 'pointer', display: 'flex' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                                        >
                                            <Trash2 size={14} />
                                        </span>
                                    )}
                                </div>
                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f2f3f5', marginBottom: '4px' }}>
                                    {post.title}
                                </h4>
                                <p style={{
                                    fontSize: '13px', color: '#b5bac1', marginBottom: '6px', lineHeight: 1.4,
                                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                }}>
                                    {post.content}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#949ba4' }}>
                                    <MessageCircle size={13} />
                                    <span>{post.replyCount} replies</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ Right: Thread panel ═══ */}
            <AnimatePresence>
                {activePost && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '380px', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: '380px', minWidth: 0,
                            background: '#141517', borderLeft: '1px solid #0d0e10',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        }}
                    >
                        {/* Thread header */}
                        <div style={{
                            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px',
                        }}>
                            <MessageCircle size={16} color="#b5bac1" />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f2f3f5', flex: 1 }}>Thread</span>
                            <button onClick={() => { setActivePost(null); setReplies([]); }}
                                style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thread content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                            {threadLoading ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: '#949ba4' }}>
                                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : (
                                <>
                                    {/* Original post */}
                                    <div style={{
                                        padding: '12px', background: '#1e1f22', borderRadius: '8px',
                                        marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: `hsl(${activePost.authorAvatarHue || 0}, 60%, 45%)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 700, color: '#fff',
                                            }}>
                                                {activePost.author?.slice(0, 2)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5' }}>{activePost.author}</div>
                                                <div style={{ fontSize: '11px', color: '#949ba4' }}>{timeAgo(activePost.createdAt)}</div>
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5', marginBottom: '8px' }}>
                                            {activePost.title}
                                        </h3>
                                        <p style={{ fontSize: '14px', color: '#dcddde', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                            {activePost.content}
                                        </p>
                                    </div>

                                    {/* Replies */}
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#949ba4', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                                    </div>

                                    {replies.map(reply => (
                                        <div key={reply.id} style={{
                                            display: 'flex', gap: '8px', marginBottom: '12px',
                                            marginLeft: Math.min(reply.depth || 0, 3) * 16,
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                background: `hsl(${reply.authorAvatarHue || 0}, 60%, 45%)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
                                            }}>
                                                {reply.author?.slice(0, 2)?.toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f2f3f5' }}>{reply.author}</span>
                                                    <span style={{ fontSize: '11px', color: '#949ba4' }}>{timeAgo(reply.createdAt)}</span>
                                                </div>
                                                <p style={{ fontSize: '13px', color: '#dcddde', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                                    {reply.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Reply input */}
                        <div style={{
                            padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: '8px', alignItems: 'flex-end',
                        }}>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                                placeholder="Reply to thread..."
                                rows={1}
                                style={{
                                    flex: 1, padding: '8px 12px', background: '#1e1f22',
                                    border: '1px solid #3f4147', borderRadius: '6px',
                                    color: '#f2f3f5', fontSize: '13px', outline: 'none',
                                    resize: 'none', minHeight: '36px', maxHeight: '100px',
                                    fontFamily: 'inherit',
                                }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleReply}
                                disabled={replySubmitting || !replyContent.trim()}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '6px',
                                    background: replyContent.trim() ? '#5865f2' : '#3f4147',
                                    color: '#fff', border: 'none',
                                    cursor: replyContent.trim() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Send size={16} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Create Post Modal ═══ */}
            <AnimatePresence>
                {showCreatePost && (
                    <>
                        <div onClick={() => setShowCreatePost(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '520px', background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999, padding: '24px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                                    New Thread in #{activeChannel?.name}
                                </h3>
                                <button onClick={() => setShowCreatePost(false)} style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>Title</span>
                                <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Thread title"
                                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', background: '#1e1f22', border: '1px solid #3f4147', borderRadius: '6px', color: '#f2f3f5', fontSize: '14px', outline: 'none' }}
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>Content</span>
                                <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="What do you want to discuss?" rows={5}
                                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', background: '#1e1f22', border: '1px solid #3f4147', borderRadius: '6px', color: '#f2f3f5', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </label>

                            {postError && <div style={{ fontSize: '13px', color: '#da373c', marginBottom: '12px' }}>{postError}</div>}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowCreatePost(false)}
                                    style={{ padding: '8px 16px', color: '#b5bac1', background: 'transparent', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreatePost}
                                    disabled={postSubmitting || !postTitle.trim() || !postContent.trim()}
                                    style={{
                                        padding: '8px 20px', background: '#5865f2', color: '#fff',
                                        border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                                        cursor: (postTitle.trim() && postContent.trim()) ? 'pointer' : 'default',
                                        opacity: (postTitle.trim() && postContent.trim()) ? 1 : 0.5,
                                    }}>
                                    {postSubmitting ? 'Creating...' : 'Create Thread'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══ Create Channel Modal ═══ */}
            <AnimatePresence>
                {showCreateChannel && (
                    <>
                        <div onClick={() => setShowCreateChannel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '440px', background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999, padding: '24px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>Create Channel</h3>
                                <button onClick={() => setShowCreateChannel(false)} style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>Channel Name</span>
                                <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="e.g. announcements"
                                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', background: '#1e1f22', border: '1px solid #3f4147', borderRadius: '6px', color: '#f2f3f5', fontSize: '14px', outline: 'none' }}
                                />
                            </label>

                            <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>Description (optional)</span>
                                <input value={channelDesc} onChange={(e) => setChannelDesc(e.target.value)} placeholder="What's this channel for?"
                                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', background: '#1e1f22', border: '1px solid #3f4147', borderRadius: '6px', color: '#f2f3f5', fontSize: '14px', outline: 'none' }}
                                />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={channelPrivate} onChange={(e) => setChannelPrivate(e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: '#5865f2' }} />
                                <Lock size={16} color="#da373c" />
                                <span style={{ fontSize: '14px', color: '#f2f3f5' }}>Private Channel</span>
                            </label>

                            {channelPrivate && (
                                <label style={{ display: 'block', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase' }}>Channel Password</span>
                                    <input type="password" value={channelPassword} onChange={(e) => setChannelPassword(e.target.value)} placeholder="Set a password"
                                        style={{ width: '100%', marginTop: '6px', padding: '10px 12px', background: '#1e1f22', border: '1px solid #3f4147', borderRadius: '6px', color: '#f2f3f5', fontSize: '14px', outline: 'none' }}
                                    />
                                </label>
                            )}

                            {createError && <div style={{ fontSize: '13px', color: '#da373c', marginBottom: '12px' }}>{createError}</div>}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowCreateChannel(false)}
                                    style={{ padding: '8px 16px', color: '#b5bac1', background: 'transparent', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                                <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateChannel} disabled={creating || !channelName.trim()}
                                    style={{ padding: '8px 20px', background: '#5865f2', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: channelName.trim() ? 'pointer' : 'default', opacity: channelName.trim() ? 1 : 0.5 }}>
                                    {creating ? 'Creating...' : 'Create Channel'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══ Members Modal ═══ */}
            <AnimatePresence>
                {showMembers && (
                    <>
                        <div onClick={() => setShowMembers(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998 }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '440px', background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999,
                                maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                                    Members — {members.length}
                                </h3>
                                <button onClick={() => setShowMembers(false)} style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ overflowY: 'auto', padding: '8px 12px' }}>
                                {members.map(member => (
                                    <div key={member.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px', borderRadius: '6px',
                                    }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: `hsl(${member.avatarHue || 0}, 60%, 45%)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 700, color: '#fff',
                                        }}>
                                            {member.name?.slice(0, 2)?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#f2f3f5' }}>{member.name}</div>
                                        </div>
                                        {isAdminOrAbove && member.serverRole !== 'owner' && member.id !== user?.id ? (
                                            <select
                                                value={member.serverRole}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                disabled={roleLoading === member.id}
                                                style={{
                                                    background: '#1e1f22', color: '#b5bac1', border: '1px solid #3f4147',
                                                    borderRadius: '4px', padding: '2px 6px', fontSize: '11px', outline: 'none',
                                                }}
                                            >
                                                <option value="member">member</option>
                                                <option value="moderator">moderator</option>
                                                {isOwner && <option value="admin">admin</option>}
                                            </select>
                                        ) : (
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                                                background: member.serverRole === 'owner' ? 'rgba(240,178,50,0.15)' :
                                                    member.serverRole === 'admin' ? 'rgba(88,101,242,0.15)' :
                                                        member.serverRole === 'moderator' ? 'rgba(35,165,89,0.15)' : 'rgba(255,255,255,0.06)',
                                                color: member.serverRole === 'owner' ? '#f0b232' :
                                                    member.serverRole === 'admin' ? '#5865f2' :
                                                        member.serverRole === 'moderator' ? '#23a559' : '#949ba4',
                                            }}>
                                                {member.serverRole}
                                            </span>
                                        )}
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