import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBigUp, MessageSquare, Clock } from 'lucide-react';
import StateBadge from '../ui/StateBadge';
import UrgencyMeter from '../ui/UrgencyMeter';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PostCard({ post }) {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ backgroundColor: '#2e3035' }}
            onClick={() => navigate(`/posts/${post.id}`)}
            style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                transition: 'background 0.15s',
            }}
        >
            {/* Avatar */}
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `hsl(${post.authorAvatarHue || 0}, 60%, 45%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
            }}>
                {post.author?.slice(0, 2)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '4px',
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f2f3f5' }}>
                        {post.author}
                    </span>
                    <span style={{ fontSize: '11px', color: '#949ba4' }}>
                        {timeAgo(post.createdAt)}
                    </span>
                    <StateBadge state={post.state} />
                </div>

                {/* Title */}
                <h3 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#f2f3f5',
                    marginBottom: '6px',
                    lineHeight: 1.3,
                }}>
                    {post.title}
                </h3>

                {/* Preview */}
                <p style={{
                    fontSize: '13px',
                    color: '#b5bac1',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '10px',
                }}>
                    {post.content}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {post.tags.map(tag => (
                            <span key={tag} style={{
                                padding: '1px 8px',
                                borderRadius: '100px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#b5bac1',
                                background: 'rgba(255,255,255,0.06)',
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer: upvotes, comments, urgency */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    {/* Upvotes */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: post.upvoted ? 'rgba(88,101,242,0.15)' : 'rgba(255,255,255,0.04)',
                        fontSize: '13px',
                        color: post.upvoted ? '#5865f2' : '#b5bac1',
                    }}>
                        <ArrowBigUp size={16} color="#5865f2" fill={post.upvoted ? '#5865f2' : 'none'} />
                        <span style={{ fontWeight: 600 }}>{post.upvotes}</span>
                    </div>

                    {/* Comments */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        color: '#949ba4',
                    }}>
                        <MessageSquare size={14} />
                        <span>{post.commentCount}</span>
                    </div>

                    {/* DMS indicator */}
                    {post.state === 'escalated' && post.responseDeadline && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#da373c',
                            fontWeight: 600,
                        }}>
                            <Clock size={12} />
                            <span>DMS Active</span>
                        </div>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Urgency */}
                    <UrgencyMeter score={post.urgencyScore} compact />
                </div>
            </div>
        </motion.div>
    );
}
