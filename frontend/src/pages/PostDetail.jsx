import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowBigUp, MessageSquare, Share2, Flag, Send } from 'lucide-react';
import { useState, useMemo } from 'react';
import StateBadge from '../components/ui/StateBadge';
import UrgencyMeter from '../components/ui/UrgencyMeter';
import DMSTimer from '../components/ui/DMSTimer';
import VerificationPoll from '../components/ui/VerificationPoll';
import ThreadedComments from '../components/posts/ThreadedComments';
import { posts, comments as commentsData } from '../data/mockData';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [commentText, setCommentText] = useState('');
    const [upvoted, setUpvoted] = useState(false);

    const post = useMemo(() => posts.find(p => p.id === postId), [postId]);
    const postComments = commentsData[postId] || [];

    if (!post) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <p>Post not found</p>
                    <button onClick={() => navigate(-1)} style={{ color: '#00a8fc', marginTop: '8px' }}>
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#313338',
                minHeight: '48px',
            }}>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => navigate(-1)}
                    style={{ display: 'flex', color: '#b5bac1' }}
                >
                    <ArrowLeft size={20} />
                </motion.button>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{
                        fontSize: '14px', fontWeight: 600, color: '#f2f3f5',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block',
                    }}>
                        {post.title}
                    </span>
                </div>
                <StateBadge state={post.state} />
            </div>

            {/* Content area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0',
            }}>
                {/* Main post */}
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '44px', height: '44px',
                            borderRadius: '50%',
                            background: `hsl(${post.author.charCodeAt(5) * 30}, 60%, 45%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 700, color: '#fff',
                            flexShrink: 0,
                        }}>
                            {post.author.slice(5, 7)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Author + time */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#f2f3f5' }}>
                                    {post.author}
                                </span>
                                <span style={{ fontSize: '12px', color: '#949ba4' }}>
                                    {timeAgo(post.createdAt)}
                                </span>
                                <StateBadge state={post.state} />
                            </div>

                            {/* Title */}
                            <h1 style={{
                                fontSize: '20px', fontWeight: 700, color: '#f2f3f5',
                                marginBottom: '12px', lineHeight: 1.3,
                            }}>
                                {post.title}
                            </h1>

                            {/* Content */}
                            <p style={{
                                fontSize: '14px', color: '#dcddde', lineHeight: 1.7,
                                marginBottom: '16px',
                            }}>
                                {post.content}
                            </p>

                            {/* Tags */}
                            {post.tags && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                    {post.tags.map(tag => (
                                        <span key={tag} style={{
                                            padding: '2px 10px', borderRadius: '100px',
                                            fontSize: '12px', fontWeight: 500,
                                            color: '#b5bac1', background: 'rgba(255,255,255,0.06)',
                                        }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Action bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setUpvoted(!upvoted)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 14px', borderRadius: '4px',
                                        background: upvoted ? 'rgba(88,101,242,0.2)' : 'rgba(255,255,255,0.04)',
                                        color: upvoted ? '#5865f2' : '#b5bac1',
                                        fontSize: '13px', fontWeight: 600,
                                        border: upvoted ? '1px solid #5865f233' : '1px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <ArrowBigUp size={18} fill={upvoted ? '#5865f2' : 'none'} />
                                    {post.upvotes + (upvoted ? 1 : 0)}
                                </motion.button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#b5bac1', fontSize: '13px',
                                }}>
                                    <MessageSquare size={16} /> {post.commentCount}
                                </button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#b5bac1', fontSize: '13px',
                                }}>
                                    <Share2 size={16} /> Share
                                </button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#b5bac1', fontSize: '13px',
                                }}>
                                    <Flag size={16} /> Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Urgency Meter */}
                <div style={{ padding: '16px 20px' }}>
                    <UrgencyMeter score={post.urgencyScore} />
                </div>

                {/* DMS Timer (if escalated) */}
                {(post.state === 'escalated' || post.state === 'resolution_rejected') && post.responseDeadline && (
                    <div style={{ padding: '0 20px 16px' }}>
                        <DMSTimer
                            deadline={post.responseDeadline}
                            escalationLevel={post.escalationLevel}
                            categoryId={post.categoryId}
                        />
                    </div>
                )}

                {/* Verification Poll (if pending verification) */}
                {post.state === 'pending_verification' && post.adminResponse && (
                    <div style={{ padding: '0 20px 16px' }}>
                        <VerificationPoll
                            adminResponse={post.adminResponse}
                            deadline={post.verificationDeadline || '2026-03-01T12:00:00Z'}
                            votes={post.verificationVotes || { yes: 0, no: 0 }}
                        />
                    </div>
                )}

                {/* Admin response (if exists and not pending verification) */}
                {post.adminResponse && post.state !== 'pending_verification' && (
                    <div style={{ padding: '0 20px 16px' }}>
                        <div style={{
                            padding: '16px',
                            background: 'rgba(35,165,89,0.06)',
                            borderRadius: '8px',
                            border: '1px solid rgba(35,165,89,0.2)',
                            borderLeft: '3px solid #23a559',
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#23a559', textTransform: 'uppercase', marginBottom: '6px' }}>
                                🏛️ Admin Response
                            </div>
                            <p style={{ fontSize: '14px', color: '#dcddde', lineHeight: 1.5 }}>
                                {post.adminResponse}
                            </p>
                        </div>
                    </div>
                )}

                {/* Comments section */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '16px 0 0',
                }}>
                    <div style={{ padding: '0 20px 12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f2f3f5' }}>
                            Comments ({postComments.length})
                        </h3>
                    </div>
                    <ThreadedComments comments={postComments} />
                </div>

                {/* Spacer */}
                <div style={{ height: '80px' }} />
            </div>

            {/* Comment input */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: '#313338',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#383a40',
                    borderRadius: '8px',
                }}>
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#f2f3f5',
                            fontSize: '14px',
                            padding: '4px 0',
                        }}
                    />
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                            display: 'flex',
                            color: commentText ? '#5865f2' : '#949ba4',
                            transition: 'color 0.15s',
                        }}
                    >
                        <Send size={18} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
