import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, ArrowUp, MessageCircle, AlertTriangle, CheckCircle, Megaphone, Sparkles, CheckCheck } from 'lucide-react';
import api from '../services/api';

const TYPE_CONFIG = {
    upvote: { icon: ArrowUp, color: '#f59e0b', label: 'Upvote' },
    comment: { icon: MessageCircle, color: '#5865f2', label: 'Comment' },
    escalation: { icon: AlertTriangle, color: '#da373c', label: 'Escalation' },
    resolution: { icon: CheckCircle, color: '#23a559', label: 'Resolution' },
    mention: { icon: Megaphone, color: '#e879f9', label: 'Mention' },
    general: { icon: Sparkles, color: '#949ba4', label: 'General' },
};

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | unread

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(id) {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }

    async function markAllRead() {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }

    const displayed = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: '#1a1b1e',
        }}>
            {/* Header */}
            <div style={{
                maxWidth: '700px',
                margin: '0 auto',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Bell size={24} color="#f2f3f5" />
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#da373c',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#fff',
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Filter tabs */}
                        {['all', 'unread'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    background: filter === f ? '#5865f2' : 'rgba(255,255,255,0.06)',
                                    color: filter === f ? '#fff' : '#b5bac1',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {f === 'all' ? 'All' : `Unread (${unreadCount})`}
                            </button>
                        ))}

                        {/* Mark all read */}
                        {unreadCount > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={markAllRead}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    background: 'rgba(35, 165, 89, 0.15)',
                                    color: '#23a559',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <CheckCheck size={14} /> Mark all read
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#949ba4' }}>
                        Loading notifications...
                    </div>
                )}

                {/* Empty state */}
                {!loading && displayed.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#949ba4',
                    }}>
                        <Bell size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#b5bac1' }}>
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>
                            {filter === 'unread'
                                ? 'You\'re all caught up!'
                                : 'Notifications will appear here when someone interacts with your posts.'}
                        </p>
                    </div>
                )}

                {/* Notification list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {displayed.map((notif, i) => {
                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                        const Icon = config.icon;

                        return (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => {
                                    if (!notif.isRead) markAsRead(notif.id);
                                    if (notif.link) navigate(notif.link);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    borderRadius: '8px',
                                    background: notif.isRead
                                        ? 'transparent'
                                        : 'rgba(88, 101, 242, 0.08)',
                                    cursor: notif.link ? 'pointer' : 'default',
                                    transition: 'background 0.15s',
                                    borderLeft: notif.isRead
                                        ? '3px solid transparent'
                                        : `3px solid ${config.color}`,
                                }}
                                whileHover={{
                                    background: 'rgba(255,255,255,0.04)',
                                }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: `${config.color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                }}>
                                    <Icon size={18} color={config.color} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: notif.isRead ? 500 : 700,
                                        color: '#f2f3f5',
                                        marginBottom: '2px',
                                    }}>
                                        {notif.title}
                                    </div>
                                    {notif.message && (
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#949ba4',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {notif.message}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#6d6f78',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: `${config.color}15`,
                                            color: config.color,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                        }}>
                                            {config.label}
                                        </span>
                                        {timeAgo(notif.createdAt)}
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!notif.isRead && (
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: config.color,
                                        flexShrink: 0,
                                        marginTop: '8px',
                                    }} />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
