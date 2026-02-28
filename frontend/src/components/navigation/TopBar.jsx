import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Search, Bell, HelpCircle, Users, Menu, X, ExternalLink, MessageCircle, Shield, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

export default function TopBar({ channelName = 'general', description = '', onMenuClick }) {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const searchInputRef = useRef(null);
    const searchTimerRef = useRef(null);

    useEffect(() => {
        async function fetchUnread() {
            try {
                const res = await api.get('/notifications/unread-count');
                setUnreadCount(res.data.count);
            } catch { /* ignore */ }
        }
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    // Keyboard shortcut Ctrl+K to open search
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setHelpOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get('/posts/search', { params: { q: searchQuery } });
                setSearchResults(res.data.posts || []);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchQuery]);

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

                {/* Search bar — opens search modal */}
                <div
                    className="hide-on-mobile"
                    onClick={() => setSearchOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: '#0d0e10',
                        borderRadius: '4px',
                        width: '170px',
                        cursor: 'pointer',
                    }}
                >
                    <span style={{ fontSize: '12px', color: '#949ba4', flex: 1 }}>Search</span>
                    <span style={{ fontSize: '10px', color: '#72767d', background: '#2b2d31', padding: '1px 4px', borderRadius: '3px' }}>Ctrl+K</span>
                </div>

                {/* Notifications bell */}
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
                    onClick={() => setHelpOpen(true)}
                    style={{ display: 'flex', color: '#b5bac1', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Help"
                >
                    <HelpCircle size={20} />
                </motion.button>
            </div>

            {/* Search Modal */}
            <AnimatePresence>
                {searchOpen && (
                    <>
                        <div
                            onClick={() => setSearchOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                                zIndex: 9998,
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                position: 'fixed',
                                top: '20%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '90%',
                                maxWidth: '560px',
                                background: '#2b2d31',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 9999,
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <Search size={20} color="#949ba4" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search posts, grievances..."
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none',
                                        color: '#f2f3f5', fontSize: '16px', outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={() => setSearchOpen(false)}
                                    style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
                                {searching && (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                                        Searching...
                                    </div>
                                )}
                                {!searching && searchQuery && searchResults.length === 0 && (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                                        No results found for "{searchQuery}"
                                    </div>
                                )}
                                {!searching && searchResults.map(post => (
                                    <div
                                        key={post.id}
                                        onClick={() => {
                                            navigate(`/posts/${post.id}`);
                                            setSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#35373c'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5', marginBottom: '2px' }}>
                                            {post.title}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#949ba4' }}>
                                            in #{post.channelId} · {post.author}
                                        </div>
                                    </div>
                                ))}
                                {!searching && !searchQuery && (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                                        Type to search posts and grievances
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Help Modal */}
            <AnimatePresence>
                {helpOpen && (
                    <>
                        <div
                            onClick={() => setHelpOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                                zIndex: 9998,
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '90%',
                                maxWidth: '480px',
                                background: '#2b2d31',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 9999,
                                padding: '24px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>Help & Info</h2>
                                <button
                                    onClick={() => setHelpOpen(false)}
                                    style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <HelpItem icon={BookOpen} title="What is Gravit?"
                                    desc="Gravit is a student grievance redressal platform. Post concerns, upvote issues, and track resolutions." />
                                <HelpItem icon={MessageCircle} title="How do posts work?"
                                    desc="Create posts in channels. Posts gain urgency via upvotes and auto-escalate through the Dead Man's Switch if authorities don't respond." />
                                <HelpItem icon={Shield} title="Moderation"
                                    desc="All posts are moderated for profanity and harmful content. Identities are pseudonymized for privacy." />
                                <HelpItem icon={ExternalLink} title="Keyboard Shortcuts"
                                    desc="Ctrl+K — Search | Esc — Close modals" />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function HelpItem({ icon: Icon, title, desc }) {
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'rgba(88,101,242,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <Icon size={18} color="#5865f2" />
            </div>
            <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5', marginBottom: '2px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#949ba4', lineHeight: 1.4 }}>{desc}</div>
            </div>
        </div>
    );
}