import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Settings, LogOut } from 'lucide-react';
import { channels } from '../../data/mockData';

export default function ServerBar() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <div style={{
            width: '72px',
            minWidth: '72px',
            height: '100vh',
            background: '#1e1f22',
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
                onClick={() => navigate('/channels/curriculum')}
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: isActive('/channels') ? '16px' : '24px',
                    background: isActive('/channels')
                        ? 'linear-gradient(135deg, #5865f2, #7289da)'
                        : '#313338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#fff',
                    transition: 'border-radius 0.2s',
                    position: 'relative',
                }}
            >
                G
                {isActive('/channels') && (
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
                background: '#35373c',
                borderRadius: '1px',
                margin: '4px 0',
            }} />

            {/* Channel category icons */}
            {channels.map((cat) => {
                const firstSub = cat.subChannels[0]?.id;
                const active = location.pathname.includes(cat.id) ||
                    cat.subChannels.some(s => location.pathname.includes(s.id));

                return (
                    <motion.button
                        key={cat.id}
                        whileHover={{ scale: 1.1, borderRadius: '16px' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/channels/${firstSub}`)}
                        title={cat.name}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: active ? '16px' : '24px',
                            background: active ? '#5865f2' : '#313338',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            transition: 'border-radius 0.2s, background 0.2s',
                            position: 'relative',
                        }}
                    >
                        {cat.icon}
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

            {/* Separator */}
            <div style={{
                width: '32px',
                height: '2px',
                background: '#35373c',
                borderRadius: '1px',
                margin: '4px 0',
            }} />

            {/* Dashboard */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                title="Admin Dashboard"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: isActive('/dashboard') ? '16px' : '24px',
                    background: isActive('/dashboard') ? '#23a559' : '#313338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive('/dashboard') ? '#fff' : '#23a559',
                    transition: 'border-radius 0.2s, background 0.2s',
                }}
            >
                <BarChart3 size={22} />
            </motion.button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Settings */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { }}
                title="Settings"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    background: '#313338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b5bac1',
                    marginBottom: '4px',
                }}
            >
                <Settings size={20} />
            </motion.button>

            {/* Logout */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                title="Logout"
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    background: '#313338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#da373c',
                    marginBottom: '12px',
                }}
            >
                <LogOut size={20} />
            </motion.button>
        </div>
    );
}
