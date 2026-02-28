import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, LogOut, User, GraduationCap, Landmark, Building2, Briefcase, Home, Plus, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';

// Map category names to clean Lucide icons
const CATEGORY_ICONS = {
    academia: GraduationCap,
    bureaucracy: Landmark,
    infrastructure: Building2,
    placement: Briefcase,
    hostel: Home,
};

export default function ServerBar({ selectedServer, onSelectServer }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const { on, off } = useSocket();
    const [channels, setChannels] = useState([]);
    const [customServers, setCustomServers] = useState([]);

    const fetchServers = useCallback(async () => {
        try {
            const res = await api.get('/servers/mine').catch(() => ({ data: { servers: [] } }));
            setCustomServers(res.data.servers || []);
        } catch {}
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                const [chRes, srvRes] = await Promise.all([
                    api.get('/channels'),
                    api.get('/servers/mine').catch(() => ({ data: { servers: [] } })),
                ]);
                setChannels(chRes.data.channels);
                setCustomServers(srvRes.data.servers || []);
            } catch (err) {
                console.error('Failed to load server bar data:', err);
            }
        }
        fetchData();
    }, []);

    // Real-time server list updates via socket
    useEffect(() => {
        const handleServerCreated = () => fetchServers();
        const handleServerJoined = () => fetchServers();
        const handleServerLeft = ({ serverId }) => {
            setCustomServers(prev => prev.filter(s => s.id !== parseInt(serverId) && s.id !== serverId));
        };
        const handleServerDeleted = ({ serverId }) => {
            setCustomServers(prev => prev.filter(s => s.id !== parseInt(serverId) && s.id !== serverId));
        };

        on('server:created', handleServerCreated);
        on('server:joined', handleServerJoined);
        on('server:left', handleServerLeft);
        on('server:deleted', handleServerDeleted);

        return () => {
            off('server:created', handleServerCreated);
            off('server:joined', handleServerJoined);
            off('server:left', handleServerLeft);
            off('server:deleted', handleServerDeleted);
        };
    }, [on, off, fetchServers]);

    const isActive = (path) => location.pathname.startsWith(path);

    const handleServerClick = (cat) => {
        const firstSub = cat.subChannels?.[0]?.id;
        onSelectServer?.(cat.id);
        if (firstSub) navigate(`/channels/${firstSub}`);
    };

    const handleCustomServerClick = (server) => {
        onSelectServer?.(`server-${server.id}`);
        navigate(`/servers/${server.id}`);
    };

    return (
        <div style={{
            width: '72px',
            minWidth: '72px',
            height: '100vh',
            background: '#0d0e10',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '12px',
            gap: '8px',
            overflow: 'hidden',
        }}>
            {/* Gravit Logo */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    onSelectServer?.(null);
                    navigate('/channels/curriculum');
                }}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: !selectedServer && isActive('/channels') ? '16px' : '24px',
                    background: !selectedServer && isActive('/channels')
                        ? 'linear-gradient(135deg, #5865f2, #7289da)'
                        : '#1a1b1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#fff',
                    transition: 'border-radius 0.2s',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                G
                {!selectedServer && isActive('/channels') && (
                    <motion.div
                        layoutId="serverIndicator"
                        style={{
                            position: 'absolute',
                            left: '-16px',
                            width: '4px',
                            height: '40px',
                            background: '#f2f3f5',
                            borderRadius: '0 4px 4px 0',
                        }}
                    />
                )}
            </motion.button>

            {/* Separator */}
            <div style={{
                width: '32px',
                height: '2px',
                background: '#252729',
                borderRadius: '1px',
                margin: '4px 0',
                flexShrink: 0,
            }} />

            {/* Scrollable server list */}
            <div className="hide-scrollbar" style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                paddingBottom: '8px',
            }}>
                {/* Category servers */}
                {channels.map((cat) => {
                    const active = selectedServer === cat.id ||
                        (!selectedServer && (location.pathname.includes(cat.id) ||
                            cat.subChannels.some(s => location.pathname.includes(s.id))));

                    return (
                        <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.1, borderRadius: '16px' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleServerClick(cat)}
                            title={cat.name}
                            style={{
                                width: '48px',
                                height: '48px',
                                minHeight: '48px',
                                borderRadius: active ? '16px' : '24px',
                                background: active ? '#5865f2' : '#1a1b1e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px',
                                transition: 'border-radius 0.2s, background 0.2s',
                                position: 'relative',
                                border: 'none',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {(() => {
                                const IconComp = CATEGORY_ICONS[cat.category || cat.id];
                                return IconComp
                                    ? <IconComp size={22} color={active ? '#fff' : '#b5bac1'} />
                                    : <span style={{ fontSize: '22px' }}>{cat.icon}</span>;
                            })()}
                            {active && (
                                <motion.div
                                    layoutId="catIndicator"
                                    style={{
                                        position: 'absolute',
                                        left: '-16px',
                                        width: '4px',
                                        height: '20px',
                                        background: '#f2f3f5',
                                        borderRadius: '0 4px 4px 0',
                                    }}
                                />
                            )}
                        </motion.button>
                    );
                })}

                {/* Separator before custom servers */}
                {customServers.length > 0 && (
                    <div style={{
                        width: '32px',
                        height: '2px',
                        background: '#252729',
                        borderRadius: '1px',
                        margin: '4px 0',
                        flexShrink: 0,
                    }} />
                )}

                {/* Custom / user-created servers */}
                {customServers.map((server) => {
                    const active = selectedServer === `server-${server.id}`;
                    return (
                        <motion.button
                            key={server.id}
                            whileHover={{ scale: 1.1, borderRadius: '16px' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCustomServerClick(server)}
                            title={server.name}
                            style={{
                                width: '48px',
                                height: '48px',
                                minHeight: '48px',
                                borderRadius: active ? '16px' : '24px',
                                background: active ? '#5865f2' : '#1a1b1e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 700,
                                color: active ? '#fff' : '#b5bac1',
                                transition: 'border-radius 0.2s, background 0.2s',
                                position: 'relative',
                                border: 'none',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {server.icon || server.name?.slice(0, 2)?.toUpperCase()}
                            {active && (
                                <motion.div
                                    style={{
                                        position: 'absolute',
                                        left: '-16px',
                                        width: '4px',
                                        height: '20px',
                                        background: '#f2f3f5',
                                        borderRadius: '0 4px 4px 0',
                                    }}
                                />
                            )}
                        </motion.button>
                    );
                })}

                {/* Create Server */}
                <motion.button
                    whileHover={{ scale: 1.1, borderRadius: '16px' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/create-server')}
                    title="Create a Server"
                    style={{
                        width: '48px',
                        height: '48px',
                        minHeight: '48px',
                        borderRadius: '24px',
                        background: '#1a1b1e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#23a559',
                        transition: 'border-radius 0.2s, background 0.2s, color 0.2s',
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <Plus size={22} />
                </motion.button>

                {/* Explore servers */}
                <motion.button
                    whileHover={{ scale: 1.1, borderRadius: '16px' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/explore')}
                    title="Explore Servers"
                    style={{
                        width: '48px',
                        height: '48px',
                        minHeight: '48px',
                        borderRadius: '24px',
                        background: '#1a1b1e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#23a559',
                        transition: 'border-radius 0.2s, background 0.2s',
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <Compass size={22} />
                </motion.button>
            </div>

            {/* Separator */}
            <div style={{
                width: '32px',
                height: '2px',
                background: '#252729',
                borderRadius: '1px',
                margin: '4px 0',
                flexShrink: 0,
            }} />

            {/* Dashboard — hidden for students */}
            {user?.role && user.role !== 'student' && (
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                title="Admin Dashboard"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: isActive('/dashboard') ? '16px' : '24px',
                    background: isActive('/dashboard') ? '#23a559' : '#1a1b1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive('/dashboard') ? '#fff' : '#23a559',
                    transition: 'border-radius 0.2s, background 0.2s',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                <BarChart3 size={22} />
            </motion.button>
            )}

            {/* Logout */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { logout(); navigate('/login'); }}
                title="Logout"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    background: '#1a1b1e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#da373c',
                    marginBottom: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                <LogOut size={20} />
            </motion.button>
        </div>
    );
}
