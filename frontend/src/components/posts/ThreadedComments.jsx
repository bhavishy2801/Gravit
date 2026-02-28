import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowBigUp, Reply, CornerDownRight, Send, X } from 'lucide-react';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getDepth(path) {
    return path.split('/').length - 1;
}

export default function ThreadedComments({ comments, onReply, onUpvote }) {
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleReplySubmit = async (parentId) => {
        if (!replyText.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onReply?.(parentId, replyText.trim());
            setReplyText('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Reply failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!comments || comments.length === 0) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#949ba4',
                fontSize: '13px',
            }}>
                No comments yet. Be the first to respond.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {comments.map((comment, idx) => {
                const depth = getDepth(comment.path);
                const isReply = depth > 1;
                const isReplying = replyingTo === comment.id;

                return (
                    <div key={comment.id}>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            style={{
                                display: 'flex',
                                gap: '12px',
                                padding: '8px 16px',
                                marginLeft: `${(depth - 1) * 28}px`,
                                borderLeft: isReply ? '2px solid #3f4147' : 'none',
                                position: 'relative',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            {isReply && (
                                <CornerDownRight
                                    size={12}
                                    color="#3f4147"
                                    style={{
                                        position: 'absolute',
                                        left: '-8px',
                                        top: '14px',
                                    }}
                                />
                            )}

                            {/* Avatar */}
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: `hsl(${comment.authorAvatarHue || (comment.author?.charCodeAt?.(5) * 30) || 0}, 55%, 40%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                            }}>
                                {comment.author?.slice(0, 2)}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f2f3f5' }}>
                                        {comment.author}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#949ba4' }}>
                                        {timeAgo(comment.createdAt)}
                                    </span>
                                </div>
                                <p style={{ fontSize: '14px', color: '#dcddde', lineHeight: 1.5, marginBottom: '6px' }}>
                                    {comment.content}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button
                                        onClick={() => onUpvote?.(comment.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '12px',
                                            color: comment.upvoted ? '#5865f2' : '#949ba4',
                                            padding: '2px 6px', borderRadius: '4px',
                                            transition: 'all 0.15s',
                                            background: comment.upvoted ? 'rgba(88,101,242,0.1)' : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => { if (!comment.upvoted) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f2f3f5'; } }}
                                        onMouseLeave={(e) => { if (!comment.upvoted) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#949ba4'; } }}
                                    >
                                        <ArrowBigUp size={14} fill={comment.upvoted ? '#5865f2' : 'none'} />
                                        <span>{comment.upvotes}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setReplyingTo(isReplying ? null : comment.id);
                                            setReplyText('');
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '12px',
                                            color: isReplying ? '#5865f2' : '#949ba4',
                                            padding: '2px 6px', borderRadius: '4px',
                                            transition: 'all 0.15s',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f2f3f5'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isReplying ? '#5865f2' : '#949ba4'; }}
                                    >
                                        <Reply size={14} />
                                        <span>Reply</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Reply input */}
                        {isReplying && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    marginLeft: `${depth * 28}px`,
                                    padding: '4px 16px 8px',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    background: '#383a40',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(88,101,242,0.3)',
                                }}>
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReplySubmit(comment.id);
                                            }
                                            if (e.key === 'Escape') {
                                                setReplyingTo(null);
                                                setReplyText('');
                                            }
                                        }}
                                        placeholder={`Reply to ${comment.author}...`}
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#f2f3f5',
                                            fontSize: '13px',
                                            outline: 'none',
                                            padding: '2px 0',
                                        }}
                                    />
                                    <button
                                        onClick={() => handleReplySubmit(comment.id)}
                                        disabled={!replyText.trim() || submitting}
                                        style={{
                                            display: 'flex',
                                            color: replyText.trim() ? '#5865f2' : '#949ba4',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: replyText.trim() ? 'pointer' : 'default',
                                        }}
                                    >
                                        <Send size={14} />
                                    </button>
                                    <button
                                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                        style={{
                                            display: 'flex',
                                            color: '#949ba4',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
