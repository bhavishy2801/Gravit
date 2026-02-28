import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Search, Bell, HelpCircle, Users, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

export default function TopBar({ channelName = 'general', description = '', onMenuClick }) {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        async function fetchUnread() {
            try {
                const res = await api.get('/notifications/unread-count');
                setUnreadCount(res.data.count);
            } catch { /* ignore */ }
        }
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            height: '48px',
            minHeight: '48px',
            background: '#1a1b1e',
            borderBottom: '2px solid #0d0e10',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '8px',
        }}>
            {/* Mobile menu toggle */}
            <motion.button
                className="mobile-only"
                whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                style={{ color: '#b5bac1', marginRight: '8px' }}
                onClick={onMenuClick}
            >
                <Menu size={20} />
            </motion.button>

            {/* Channel name */}
            <Hash size={20} color="#949ba4" />
            <span style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#f2f3f5',
                marginRight: '4px',
            }}>
                {channelName}
            </span>

            {description && (
                <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{
                        width: '1px',
                        height: '24px',
                        background: '#3f4147',
                        margin: '0 8px',
                    }} />
                    <span style={{
                        fontSize: '13px',
                        color: '#949ba4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                    }}>
                        {description}
                    </span>
                </div>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Action icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.button
                    className="hide-on-mobile"
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    style={{ display: 'flex', color: '#b5bac1' }}
                    title="Members"
                >
                    <Users size={20} />
                </motion.button>

                {/* Search bar */}
                <div className="hide-on-mobile" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#0d0e10',
                    borderRadius: '4px',
                    width: '170px',
                    cursor: 'text',
                }}>
                    <span style={{ fontSize: '12px', color: '#949ba4', flex: 1 }}>Search</span>
                    <Search size={14} color="#949ba4" />
                </div>

                {/* Notifications bell — navigates to /notifications */}
                <motion.button
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    onClick={() => navigate('/notifications')}
                    style={{ display: 'flex', color: '#b5bac1', position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Notifications"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-6px',
                            minWidth: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#da373c',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 3px',
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </motion.button>

                <motion.button
                    className="hide-on-mobile"
                    whileHover={{ scale: 1.1, color: '#f2f3f5' }}
                    style={{ display: 'flex', color: '#b5bac1' }}
                    title="Help"
                >
                    <HelpCircle size={20} />
                </motion.button>
            </div>
        </div>
    );
}

