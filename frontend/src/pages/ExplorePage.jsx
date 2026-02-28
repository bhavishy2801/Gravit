import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Search, Users, Lock, Globe, ArrowRight, Loader } from 'lucide-react';
import api from '../services/api';

export default function ExplorePage() {
    const navigate = useNavigate();
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [joining, setJoining] = useState(null);
    const [passwordModal, setPasswordModal] = useState(null);
    const [password, setPassword] = useState('');
    const [joinError, setJoinError] = useState('');

    useEffect(() => {
        fetchServers();
    }, []);

    async function fetchServers(search) {
        setLoading(true);
        try {
            const params = search ? { search } : {};
            const res = await api.get('/servers/explore', { params });
            setServers(res.data.servers || []);
        } catch (err) {
            console.error('Failed to load servers:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchServers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleJoin = async (server) => {
        if (server.hasPassword) {
            setPasswordModal(server);
            setPassword('');
            setJoinError('');
            return;
        }

        setJoining(server.id);
        try {
            await api.post(`/servers/${server.id}/join`);
            setServers(prev => prev.map(s =>
                s.id === server.id ? { ...s, isMember: true } : s
            ));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to join');
        } finally {
            setJoining(null);
        }
    };

    const handlePasswordJoin = async () => {
        if (!passwordModal || !password) return;
        setJoining(passwordModal.id);
        setJoinError('');
        try {
            await api.post(`/servers/${passwordModal.id}/join`, { password });
            setServers(prev => prev.map(s =>
                s.id === passwordModal.id ? { ...s, isMember: true } : s
            ));
            setPasswordModal(null);
        } catch (err) {
            setJoinError(err.response?.data?.error || 'Failed to join');
        } finally {
            setJoining(null);
        }
    };

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            background: '#1a1b1e',
            padding: '32px 24px',
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '32px',
                }}>
                    <Compass size={40} color="#23a559" style={{ marginBottom: '12px' }} />
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f2f3f5', marginBottom: '8px' }}>
                        Explore Servers
                    </h1>
                    <p style={{ fontSize: '14px', color: '#949ba4', maxWidth: '400px', margin: '0 auto' }}>
                        Discover and join community servers created by other students.
                    </p>
                </div>

                {/* Search */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', background: '#2b2d31',
                    borderRadius: '8px', marginBottom: '24px',
                }}>
                    <Search size={18} color="#949ba4" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search servers..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none',
                            color: '#f2f3f5', fontSize: '15px', outline: 'none',
                        }}
                    />
                </div>

                {/* Server Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#949ba4' }}>
                        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ marginTop: '8px' }}>Loading servers...</p>
                    </div>
                ) : servers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#949ba4' }}>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#b5bac1' }}>
                            No servers found
                        </p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>
                            Be the first to create one!
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/create-server')}
                            style={{
                                marginTop: '16px', padding: '10px 24px',
                                background: '#5865f2', color: '#fff',
                                borderRadius: '6px', fontSize: '14px',
                                fontWeight: 600, border: 'none', cursor: 'pointer',
                            }}
                        >
                            Create Server
                        </motion.button>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px',
                    }}>
                        {servers.map(server => (
                            <motion.div
                                key={server.id}
                                whileHover={{ y: -2 }}
                                style={{
                                    background: '#2b2d31',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onClick={() => {
                                    if (server.isMember) navigate(`/servers/${server.id}`);
                                }}
                            >
                                {/* Server icon */}
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '16px',
                                    background: '#5865f2',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px', fontWeight: 800, color: '#fff',
                                    marginBottom: '12px',
                                }}>
                                    {server.icon || server.name?.slice(0, 2)?.toUpperCase()}
                                </div>

                                <h3 style={{
                                    fontSize: '16px', fontWeight: 700, color: '#f2f3f5',
                                    marginBottom: '4px',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    {server.name}
                                    {server.hasPassword && <Lock size={14} color="#da373c" />}
                                </h3>

                                {server.description && (
                                    <p style={{
                                        fontSize: '13px', color: '#949ba4', marginBottom: '12px',
                                        display: '-webkit-box', WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {server.description}
                                    </p>
                                )}

                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between', marginTop: 'auto',
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        fontSize: '12px', color: '#949ba4',
                                    }}>
                                        <Users size={14} />
                                        {server.memberCount} members
                                    </div>

                                    {server.isMember ? (
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '4px',
                                            background: 'rgba(35,165,89,0.15)', color: '#23a559',
                                            fontSize: '12px', fontWeight: 600,
                                        }}>
                                            Joined
                                        </span>
                                    ) : (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleJoin(server);
                                            }}
                                            disabled={joining === server.id}
                                            style={{
                                                padding: '6px 16px', borderRadius: '4px',
                                                background: '#5865f2', color: '#fff',
                                                fontSize: '12px', fontWeight: 600,
                                                border: 'none', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                            }}
                                        >
                                            {joining === server.id ? 'Joining...' : 'Join'}
                                            <ArrowRight size={14} />
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Password Modal */}
            {passwordModal && (
                <>
                    <div
                        onClick={() => setPasswordModal(null)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                            zIndex: 9998,
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            position: 'fixed', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '90%', maxWidth: '380px',
                            background: '#2b2d31', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            zIndex: 9999, padding: '24px',
                        }}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', marginBottom: '8px' }}>
                            <Lock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            Enter Server Password
                        </h3>
                        <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '16px' }}>
                            "{passwordModal.name}" requires a password to join.
                        </p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordJoin()}
                            style={{
                                width: '100%', padding: '10px 12px',
                                background: '#1e1f22', border: '1px solid #3f4147',
                                borderRadius: '6px', color: '#f2f3f5',
                                fontSize: '15px', outline: 'none', marginBottom: '8px',
                            }}
                        />
                        {joinError && (
                            <div style={{
                                fontSize: '13px', color: '#da373c', marginBottom: '8px',
                            }}>
                                {joinError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                            <button
                                onClick={() => setPasswordModal(null)}
                                style={{
                                    padding: '8px 16px', borderRadius: '6px',
                                    background: 'transparent', color: '#b5bac1',
                                    fontSize: '14px', border: 'none', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePasswordJoin}
                                disabled={!password || joining}
                                style={{
                                    padding: '8px 20px', borderRadius: '6px',
                                    background: '#5865f2', color: '#fff',
                                    fontSize: '14px', fontWeight: 600,
                                    border: 'none', cursor: password ? 'pointer' : 'default',
                                    opacity: password ? 1 : 0.5,
                                }}
                            >
                                {joining ? 'Joining...' : 'Join Server'}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
}
