import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Globe, Lock, ArrowLeft, Hash } from 'lucide-react';
import api from '../services/api';

export default function CreateServerPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/servers', {
                name: name.trim(),
                description: description.trim(),
                isPublic,
                password: !isPublic ? password : undefined,
            });
            navigate(`/servers/${res.data.server.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1b1e',
            overflowY: 'auto',
            padding: '24px',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: '#2b2d31',
                    borderRadius: '12px',
                    padding: '32px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
            >
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        color: '#949ba4', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '13px', marginBottom: '20px',
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <h1 style={{
                    fontSize: '24px', fontWeight: 800, color: '#f2f3f5',
                    textAlign: 'center', marginBottom: '8px',
                }}>
                    Create a Server
                </h1>
                <p style={{
                    fontSize: '14px', color: '#949ba4', textAlign: 'center',
                    marginBottom: '24px',
                }}>
                    Your server is where you and your group discuss topics and share concerns.
                </p>

                <form onSubmit={handleCreate}>
                    {/* Server Name */}
                    <label style={{ display: 'block', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Server Name
                        </span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. CSE Batch 2024"
                            maxLength={60}
                            required
                            style={{
                                width: '100%', marginTop: '8px',
                                padding: '10px 12px', background: '#1e1f22',
                                border: '1px solid #3f4147', borderRadius: '6px',
                                color: '#f2f3f5', fontSize: '15px', outline: 'none',
                            }}
                        />
                    </label>

                    {/* Description */}
                    <label style={{ display: 'block', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Description (optional)
                        </span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this server about?"
                            rows={3}
                            maxLength={300}
                            style={{
                                width: '100%', marginTop: '8px',
                                padding: '10px 12px', background: '#1e1f22',
                                border: '1px solid #3f4147', borderRadius: '6px',
                                color: '#f2f3f5', fontSize: '14px', outline: 'none',
                                resize: 'vertical', fontFamily: 'inherit',
                            }}
                        />
                    </label>

                    {/* Visibility */}
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Server Type
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setIsPublic(true)}
                                style={{
                                    flex: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '12px', borderRadius: '8px',
                                    background: isPublic ? 'rgba(88,101,242,0.15)' : '#1e1f22',
                                    border: isPublic ? '2px solid #5865f2' : '2px solid #3f4147',
                                    color: isPublic ? '#5865f2' : '#b5bac1',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Globe size={18} /> Public
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPublic(false)}
                                style={{
                                    flex: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '12px', borderRadius: '8px',
                                    background: !isPublic ? 'rgba(218,55,60,0.1)' : '#1e1f22',
                                    border: !isPublic ? '2px solid #da373c' : '2px solid #3f4147',
                                    color: !isPublic ? '#da373c' : '#b5bac1',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Lock size={18} /> Private
                            </button>
                        </div>
                    </div>

                    {/* Password for private */}
                    {!isPublic && (
                        <motion.label
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ display: 'block', marginBottom: '16px' }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Server Password
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Set password for joining"
                                style={{
                                    width: '100%', marginTop: '8px',
                                    padding: '10px 12px', background: '#1e1f22',
                                    border: '1px solid #3f4147', borderRadius: '6px',
                                    color: '#f2f3f5', fontSize: '15px', outline: 'none',
                                }}
                            />
                        </motion.label>
                    )}

                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '6px',
                            background: 'rgba(218,55,60,0.1)', color: '#da373c',
                            fontSize: '13px', marginBottom: '16px',
                        }}>
                            {error}
                        </div>
                    )}

                    <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading || !name.trim()}
                        style={{
                            width: '100%', padding: '12px',
                            borderRadius: '6px', background: '#5865f2',
                            color: '#fff', fontSize: '15px', fontWeight: 700,
                            border: 'none', cursor: loading ? 'wait' : 'pointer',
                            opacity: !name.trim() ? 0.5 : 1,
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Server'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
