import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Hash, Plus, Search, Lock, GraduationCap, Landmark, Building2, Briefcase, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const CATEGORY_ICONS = {
    academia: GraduationCap,
    bureaucracy: Landmark,
    infrastructure: Building2,
    placement: Briefcase,
    hostel: Home,
};

export default function ChannelSidebar({ selectedServer }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [channels, setChannels] = useState([]);
    const [serverChannels, setServerChannels] = useState([]);
    const [serverInfo, setServerInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState({});

    // Fetch institution channels
    useEffect(() => {
        async function fetchChannels() {
            try {
                const res = await api.get('/channels');
                const data = res.data.channels;
                setChannels(data);
                const expandState = {};
                data.forEach(cat => { expandState[cat.id] = true; });
                setExpanded(prev => ({ ...prev, ...expandState }));
            } catch (err) {
                console.error('Failed to load channels:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchChannels();
    }, []);

    // Fetch server channels when a custom server is selected
    useEffect(() => {
        if (!selectedServer?.startsWith('server-')) {
            setServerChannels([]);
            setServerInfo(null);
            return;
        }
        const serverId = selectedServer.replace('server-', '');
        async function fetchServerData() {
            try {
                const [srvRes, chRes] = await Promise.all([
                    api.get(`/servers/${serverId}`),
                    api.get(`/servers/${serverId}/channels`),
                ]);
                setServerInfo(srvRes.data.server);
                setServerChannels(chRes.data.channels || []);
            } catch (err) {
                console.error('Failed to load server channels:', err);
            }
        }
        fetchServerData();
    }, [selectedServer]);

    const toggleCategory = (catId) => {
        setExpanded(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const isActiveChannel = (channelId) => location.pathname.includes(channelId);

    // If a custom server is selected, show its channels
    const isCustomServer = selectedServer?.startsWith('server-');

    // Filter categories based on selectedServer
    const displayCategories = isCustomServer ? [] : (() => {
        const filtered = selectedServer
            ? channels.filter(cat => cat.id === selectedServer)
            : channels;

        return filtered.map(cat => ({
            ...cat,
            subChannels: cat.subChannels.filter(sub =>
                sub.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        })).filter(cat => cat.subChannels.length > 0);
    })();

    const serverTitle = isCustomServer
        ? (serverInfo?.name || 'Server')
        : selectedServer
            ? channels.find(c => c.id === selectedServer)?.name || 'IIT Jodhpur'
            : 'IIT Jodhpur';

    useEffect(() => {
        async function fetchChannels() {
            try {
                const res = await api.get('/channels');
                const data = res.data.channels;
                setChannels(data);
                const expandState = {};
                data.forEach(cat => { expandState[cat.id] = true; });
                setExpanded(expandState);
            } catch (err) {
                console.error('Failed to load channels:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchChannels();
    }, []);

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
            {/* Institution / Server header */}
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
                    {serverTitle}
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
                }}>
                    <Search size={14} color="#949ba4" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search channels..."
                        style={{
                            flex: 1,
                            fontSize: '12px',
                            color: '#f2f3f5',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            padding: 0,
                        }}
                    />
                </div>
            </div>

            {/* Channel list */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
            }}>
                {loading && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#949ba4', fontSize: '13px' }}>
                        Loading channels...
                    </div>
                )}

                {/* Custom server channels */}
                {isCustomServer && serverChannels.map((channel) => {
                    const active = isActiveChannel(channel.id);
                    return (
                        <motion.button
                            key={channel.id}
                            onClick={() => navigate(`/servers/${selectedServer.replace('server-', '')}/channels/${channel.id}`)}
                            whileHover={{ backgroundColor: '#35373c' }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 8px 6px 16px',
                                borderRadius: '4px',
                                margin: '1px 8px',
                                maxWidth: 'calc(100% - 16px)',
                                fontSize: '14px',
                                fontWeight: active ? 600 : 400,
                                color: active ? '#f2f3f5' : '#949ba4',
                                background: active ? '#2e3035' : 'transparent',
                                transition: 'color 0.15s',
                                cursor: 'pointer',
                                border: 'none',
                            }}
                        >
                            {channel.is_private ? <Lock size={16} style={{ opacity: 0.7 }} /> : <Hash size={16} style={{ opacity: 0.7 }} />}
                            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {channel.name}
                            </span>
                        </motion.button>
                    );
                })}

                {/* Institution category channels */}
                {!isCustomServer && displayCategories.map((category) => (
                    <div key={category.id} style={{ marginBottom: '4px' }}>
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
                                background: 'transparent',
                                border: 'none',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#f2f3f5'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#949ba4'}
                        >
                            <motion.span
                                animate={{ rotate: expanded[category.id] ? 0 : -90 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'flex', marginLeft: '4px' }}
                            >
                                <ChevronDown size={12} />
                            </motion.span>
                            {(() => {
                                const IconComp = CATEGORY_ICONS[category.category || category.id];
                                return IconComp
                                    ? <IconComp size={14} style={{ marginRight: '4px', opacity: 0.7 }} />
                                    : <span style={{ marginRight: '4px' }}>{category.icon}</span>;
                            })()}
                            {category.name}

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
                                                    border: 'none',
                                                }}
                                            >
                                                <Hash size={16} style={{
                                                    color: active ? '#f2f3f5' : '#949ba4',
                                                    opacity: active ? 1 : 0.7,
                                                }} />
                                                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {channel.name}
                                                </span>
                                                {channel.unreadCount > 0 && (
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
                                                        {channel.unreadCount}
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

            {/* User panel at bottom — click to go to profile */}
            <div
                onClick={() => navigate('/profile')}
                style={{
                    padding: '8px',
                    background: '#0d0e10',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #080809',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1a1b1e'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0d0e10'}
                title="Profile Settings"
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: user
                        ? `hsl(${user.avatarHue || 0}, 60%, 45%)`
                        : 'linear-gradient(135deg, #5865f2, #eb459e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                }}>
                    {(user?.displayName || user?.pseudonym)?.slice(0, 2)?.toUpperCase() || '??'}
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
                        {user?.displayName || user?.pseudonym || 'Anonymous'}
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: '#949ba4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {user?.role || 'student'}
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
