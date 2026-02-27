import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Send } from 'lucide-react';
import { channels } from '../../data/mockData';

export default function CreatePostModal({ isOpen, onClose, defaultChannel = '' }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [channel, setChannel] = useState(defaultChannel);
    const [tags, setTags] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock submit
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.7)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '520px',
                                maxHeight: '80vh',
                                background: '#1a1b1e',
                                borderRadius: '8px',
                                boxShadow: '0 0 0 1px rgba(4,4,5,0.15), 0 8px 16px rgba(0,0,0,0.24)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5' }}>
                                    New Grievance
                                </h2>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    onClick={onClose}
                                    style={{
                                        width: '28px', height: '28px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#b5bac1',
                                    }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} style={{
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                overflowY: 'auto',
                            }}>
                                {/* Channel select */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#b5bac1',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '8px',
                                    }}>
                                        Channel
                                    </label>
                                    <select
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: '#1e1f22',
                                            color: '#f2f3f5',
                                            borderRadius: '4px',
                                            border: 'none',
                                            fontSize: '14px',
                                        }}
                                    >
                                        <option value="">Select a channel...</option>
                                        {channels.map(cat => (
                                            <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                                                {cat.subChannels.map(sub => (
                                                    <option key={sub.id} value={sub.id}>#{sub.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Title */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#b5bac1',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '8px',
                                    }}>
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Describe your grievance in one line..."
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#b5bac1',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '8px',
                                    }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Provide full details. Include dates, locations, people involved, and what you've already tried..."
                                        rows={6}
                                        style={{
                                            width: '100%',
                                            resize: 'vertical',
                                            minHeight: '120px',
                                        }}
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#b5bac1',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '8px',
                                    }}>
                                        Tags <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma separated)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="wifi, block-c, urgent"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Submit */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        background: '#5865f2',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#4752c4'}
                                    onMouseLeave={(e) => e.target.style.background = '#5865f2'}
                                >
                                    <Send size={16} /> Submit Grievance
                                </motion.button>
                            </form>

                            {/* Footer note */}
                            <div style={{
                                padding: '12px 20px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                fontSize: '11px',
                                color: '#949ba4',
                            }}>
                                🔒 Your identity is protected. You will post as your pseudonym.
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
