import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Hash, Plus, Search } from 'lucide-react';
import { channels, currentUser, posts } from '../../data/mockData';

export default function ChannelSidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Track expanded categories — all start expanded
    const [expanded, setExpanded] = useState(
        channels.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );

    const toggleCategory = (catId) => {
        setExpanded(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const isActiveChannel = (channelId) => location.pathname.includes(channelId);

    // Count active posts per subchannel
    const getPostCount = (channelId) =>
        posts.filter(p => p.channelId === channelId && p.state !== 'resolved').length;

    return (
        <div style={{
            width: '240px',
            minWidth: '240px',
            height: '100vh',
            background: '#141517',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Institution header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '2px solid #0d0e10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                minHeight: '48px',
            }}>
                <span style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#f2f3f5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    🎓 NIT Grievances
                </span>
                <ChevronDown size={16} color="#b5bac1" />
            </div>

            {/* Search */}
            <div style={{ padding: '8px 8px 4px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    background: '#0d0e10',
                    borderRadius: '4px',
                    cursor: 'text',
                }}>
                    <Search size={14} color="#949ba4" />
                    <span style={{ fontSize: '12px', color: '#949ba4' }}>Search channels...</span>
                </div>
            </div>

            {/* Channel list */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
            }}>
                {channels.map((category) => (
                    <div key={category.id} style={{ marginBottom: '4px' }}>
                        {/* Category header — expandable */}
                        <button
                            onClick={() => toggleCategory(category.id)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 8px 6px 2px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#949ba4',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#f2f3f5'}
                            onMouseLeave={(e) => e.target.style.color = '#949ba4'}
                        >
                            <motion.span
                                animate={{ rotate: expanded[category.id] ? 0 : -90 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'flex', marginLeft: '4px' }}
                            >
                                <ChevronDown size={12} />
                            </motion.span>
                            {category.icon} {category.name}

                            {/* Add channel button */}
                            <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={{
                                    marginLeft: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: 0.5,
                                }}
                                onClick={(e) => { e.stopPropagation(); }}
                            >
                                <Plus size={14} />
                            </motion.span>
                        </button>

                        {/* Sub-channels — expand/collapse */}
                        <AnimatePresence initial={false}>
                            {expanded[category.id] && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    {category.subChannels.map((channel) => {
                                        const active = isActiveChannel(channel.id);
                                        const count = getPostCount(channel.id);

                                        return (
                                            <motion.button
                                                key={channel.id}
                                                onClick={() => navigate(`/channels/${channel.id}`)}
                                                whileHover={{ backgroundColor: '#35373c' }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 8px 6px 24px',
                                                    borderRadius: '4px',
                                                    margin: '1px 8px',
                                                    maxWidth: 'calc(100% - 16px)',
                                                    fontSize: '14px',
                                                    fontWeight: active ? 600 : 400,
                                                    color: active ? '#f2f3f5' : '#949ba4',
                                                    background: active ? '#2e3035' : 'transparent',
                                                    transition: 'color 0.15s',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Hash size={16} style={{
                                                    color: active ? '#f2f3f5' : '#949ba4',
                                                    opacity: active ? 1 : 0.7,
                                                }} />
                                                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {channel.name}
                                                </span>
                                                {count > 0 && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        background: '#da373c',
                                                        borderRadius: '10px',
                                                        padding: '0 6px',
                                                        minWidth: '18px',
                                                        textAlign: 'center',
                                                    }}>
                                                        {count}
                                                    </span>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* User panel at bottom */}
            <div style={{
                padding: '8px',
                background: '#0d0e10',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderTop: '1px solid #080809',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #5865f2, #eb459e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                }}>
                    {currentUser.pseudonym.slice(0, 2)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#f2f3f5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {currentUser.pseudonym}
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: '#949ba4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {currentUser.role}
                    </div>
                </div>
                <div style={{
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: '#23a559',
                }} />
            </div>
        </div>
    );
}
