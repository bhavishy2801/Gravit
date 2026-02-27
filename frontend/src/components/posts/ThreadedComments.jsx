import { motion } from 'framer-motion';
import { ArrowBigUp, Reply, CornerDownRight } from 'lucide-react';

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
    return path.split('/').length - 1; // 'root/c1' = depth 1, 'root/c1/c2' = depth 2
}

export default function ThreadedComments({ comments }) {
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

                return (
                    <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
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
                            background: `hsl(${comment.author.charCodeAt(5) * 30}, 55%, 40%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                        }}>
                            {comment.author.slice(5, 7)}
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
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '12px', color: '#949ba4',
                                    padding: '2px 6px', borderRadius: '4px',
                                    transition: 'all 0.15s',
                                }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = '#f2f3f5'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#949ba4'; }}
                                >
                                    <ArrowBigUp size={14} />
                                    <span>{comment.upvotes}</span>
                                </button>
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '12px', color: '#949ba4',
                                    padding: '2px 6px', borderRadius: '4px',
                                    transition: 'all 0.15s',
                                }}
                                    onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = '#f2f3f5'; }}
                                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#949ba4'; }}
                                >
                                    <Reply size={14} />
                                    <span>Reply</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
