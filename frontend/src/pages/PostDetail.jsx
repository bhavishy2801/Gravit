import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowBigUp, MessageSquare, Share2, Flag, Send, Loader, Trash2, X, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import StateBadge from '../components/ui/StateBadge';
import UrgencyMeter from '../components/ui/UrgencyMeter';
import DMSTimer from '../components/ui/DMSTimer';
import VerificationPoll from '../components/ui/VerificationPoll';
import ThreadedComments from '../components/posts/ThreadedComments';
import api from '../services/api';

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
    const { user } = useAuth();
    const [commentText, setCommentText] = useState('');
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [toast, setToast] = useState(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const canDelete = post && user && (
        user.id === post.authorId ||
        user.role === 'admin' ||
        user.role === 'moderator'
    );

    const handleDeletePost = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
        try {
            await api.delete(`/posts/${postId}`);
            navigate(-1);
        } catch (err) {
            console.error('Failed to delete post:', err);
            alert(err.response?.data?.error || 'Failed to delete post');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await api.delete(`/comments/${commentId}`);
            await fetchComments();
            setPost(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: post?.title, url });
            } else {
                await navigator.clipboard?.writeText(url);
                showToast('Link copied to clipboard!');
            }
        } catch {
            await navigator.clipboard?.writeText(url);
            showToast('Link copied to clipboard!');
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim()) return;
        setReportSubmitting(true);
        try {
            await api.post(`/posts/${postId}/report`, { reason: reportReason.trim() });
            setReportOpen(false);
            setReportReason('');
            showToast('Report submitted. Thank you!');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to submit report');
        } finally {
            setReportSubmitting(false);
        }
    };

    const fetchPost = useCallback(async () => {
        try {
            const res = await api.get(`/posts/${postId}`);
            setPost(res.data.post);
        } catch (err) {
            console.error('Failed to load post:', err);
        }
    }, [postId]);

    const fetchComments = useCallback(async () => {
        try {
            const res = await api.get(`/comments/${postId}`);
            setComments(res.data.comments);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    }, [postId]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            await Promise.all([fetchPost(), fetchComments()]);
            setLoading(false);
        }
        loadData();
    }, [fetchPost, fetchComments]);

    // Real-time: listen for comments and urgency updates on this post
    const { joinPost, leavePost, on, off } = useSocket();

    useEffect(() => {
        if (!postId) return;
        joinPost(postId);

        const handleNewComment = (commentData) => {
            setComments(prev => [...prev, commentData]);
            setPost(prev => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
        };
        const handleDeletedComment = ({ commentId }) => {
            setComments(prev => prev.filter(c => c.id !== commentId));
            setPost(prev => prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 1) - 1) } : prev);
        };
        const handleUrgencyUpdate = ({ upvoteCount, score, state }) => {
            setPost(prev => prev ? {
                ...prev,
                upvotes: upvoteCount ?? prev.upvotes,
                urgencyScore: score ?? prev.urgencyScore,
                state: state ?? prev.state,
            } : prev);
        };
        const handleVerificationStart = ({ adminResponse, deadline }) => {
            setPost(prev => prev ? {
                ...prev,
                state: 'pending_verification',
                adminResponse,
                verification: { deadline, yesCount: 0, noCount: 0, totalVotes: 0, resolutionDescription: adminResponse },
            } : prev);
        };
        const handleVerificationVote = ({ yesCount, noCount, totalVotes }) => {
            setPost(prev => prev ? {
                ...prev,
                verification: prev.verification ? { ...prev.verification, yesCount, noCount, totalVotes } : prev.verification,
            } : prev);
        };

        // Dead-man's switch auto-escalation (from cron)
        const handleDmsTriggered = ({ newState, score }) => {
            setPost(prev => prev ? {
                ...prev,
                state: newState ?? prev.state,
                urgencyScore: score ?? prev.urgencyScore,
            } : prev);
        };
        // Verification poll expiry (from cron) — resolved or rejected
        const handleStatusChange = ({ newState }) => {
            setPost(prev => prev ? { ...prev, state: newState ?? prev.state } : prev);
        };

        on('comment:new', handleNewComment);
        on('comment:deleted', handleDeletedComment);
        on('urgency:update', handleUrgencyUpdate);
        on('verification:start', handleVerificationStart);
        on('verification:vote', handleVerificationVote);
        on('dms:triggered', handleDmsTriggered);
        on('status:change', handleStatusChange);

        return () => {
            leavePost(postId);
            off('comment:new', handleNewComment);
            off('comment:deleted', handleDeletedComment);
            off('urgency:update', handleUrgencyUpdate);
            off('verification:start', handleVerificationStart);
            off('verification:vote', handleVerificationVote);
            off('dms:triggered', handleDmsTriggered);
            off('status:change', handleStatusChange);
        };
    }, [postId, joinPost, leavePost, on, off]);

    const handleUpvote = async () => {
        if (!post) return;
        try {
            const res = await api.post(`/posts/${postId}/upvote`);
            setPost(prev => ({
                ...prev,
                upvoted: res.data.upvoted,
                upvotes: res.data.upvoteCount,
                urgencyScore: res.data.urgencyScore,
                state: res.data.state,
            }));
        } catch (err) {
            console.error('Failed to upvote:', err);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || submittingComment) return;
        setSubmittingComment(true);
        try {
            await api.post(`/comments/${postId}`, { content: commentText.trim() });
            setCommentText('');
            await fetchComments();
            // Update comment count on the post
            setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
        } catch (err) {
            console.error('Failed to submit comment:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleReply = async (parentId, content) => {
        try {
            await api.post(`/comments/${postId}`, { content, parentId });
            await fetchComments();
            setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
        } catch (err) {
            console.error('Failed to reply:', err);
        }
    };

    const handleCommentUpvote = async (commentId) => {
        try {
            const res = await api.post(`/comments/${commentId}/upvote`);
            setComments(prev => prev.map(c =>
                c.id === commentId
                    ? { ...c, upvotes: res.data.upvoteCount, upvoted: res.data.upvoted }
                    : c
            ));
        } catch (err) {
            console.error('Failed to upvote comment:', err);
        }
    };

    const handleVerificationVote = async (vote) => {
        try {
            const res = await api.post(`/posts/${postId}/verify`, { vote: vote === 'yes' });
            setPost(prev => prev ? {
                ...prev,
                verification: {
                    ...prev.verification,
                    yesCount: res.data.yesCount,
                    noCount: res.data.noCount,
                    totalVotes: res.data.totalVotes,
                    userVote: vote,
                },
            } : prev);
        } catch (err) {
            console.error('Failed to vote:', err);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommentSubmit();
        }
    };

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!post) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                    <p>Post not found</p>
                    <button onClick={() => navigate(-1)} style={{ color: '#00a8fc', marginTop: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
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
                background: '#1a1b1e',
                minHeight: '48px',
            }}>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => navigate(-1)}
                    style={{ display: 'flex', color: '#b5bac1', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
                            background: `hsl(${post.authorAvatarHue || 0}, 60%, 45%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 700, color: '#fff',
                            flexShrink: 0,
                        }}>
                            {post.author?.slice(0, 2)}
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
                                marginBottom: '16px', whiteSpace: 'pre-wrap',
                            }}>
                                {post.content}
                            </p>

                            {/* Tags */}
                            {post.tags && post.tags.length > 0 && (
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
                                    onClick={handleUpvote}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 14px', borderRadius: '4px',
                                        background: post.upvoted ? 'rgba(88,101,242,0.2)' : 'rgba(255,255,255,0.04)',
                                        color: post.upvoted ? '#5865f2' : '#b5bac1',
                                        fontSize: '13px', fontWeight: 600,
                                        border: post.upvoted ? '1px solid #5865f233' : '1px solid transparent',
                                        transition: 'all 0.15s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <ArrowBigUp size={18} fill={post.upvoted ? '#5865f2' : 'none'} />
                                    {post.upvotes}
                                </motion.button>

                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#b5bac1', fontSize: '13px',
                                    border: 'none', cursor: 'default',
                                }}>
                                    <MessageSquare size={16} /> {post.commentCount}
                                </button>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 14px', borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#b5bac1', fontSize: '13px',
                                        border: 'none', cursor: 'pointer',
                                    }}
                                    onClick={handleShare}
                                >
                                    <Share2 size={16} /> Share
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 14px', borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#b5bac1', fontSize: '13px',
                                        border: 'none', cursor: 'pointer',
                                    }}
                                    onClick={() => setReportOpen(true)}
                                >
                                    <Flag size={16} /> Report
                                </motion.button>

                                {canDelete && (
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleDeletePost}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 14px', borderRadius: '4px',
                                            background: 'rgba(218,55,60,0.1)',
                                            color: '#da373c', fontSize: '13px', fontWeight: 600,
                                            border: '1px solid rgba(218,55,60,0.2)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Trash2 size={16} /> Delete
                                    </motion.button>
                                )}
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
                {post.state === 'pending_verification' && post.verification && (
                    <div style={{ padding: '0 20px 16px' }}>
                        <VerificationPoll
                            adminResponse={post.verification.resolutionDescription || post.adminResponse}
                            deadline={post.verification.deadline}
                            votes={{ yes: post.verification.yesCount, no: post.verification.noCount }}
                            userVote={post.verification.userVote}
                            onVote={handleVerificationVote}
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
                                Admin Response
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
                            Comments ({comments.length})
                        </h3>
                    </div>
                    <ThreadedComments
                        comments={comments}
                        onReply={handleReply}
                        onUpvote={handleCommentUpvote}
                        onDelete={handleDeleteComment}
                        currentUser={user}
                    />
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
                        onKeyDown={handleKeyDown}
                        placeholder="Add a comment..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#f2f3f5',
                            fontSize: '14px',
                            padding: '4px 0',
                            outline: 'none',
                        }}
                    />
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCommentSubmit}
                        disabled={submittingComment || !commentText.trim()}
                        style={{
                            display: 'flex',
                            color: commentText.trim() ? '#5865f2' : '#949ba4',
                            transition: 'color 0.15s',
                            background: 'transparent',
                            border: 'none',
                            cursor: commentText.trim() ? 'pointer' : 'default',
                        }}
                    >
                        <Send size={18} />
                    </motion.button>
                </div>
            </div>

            {/* Toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="toast-notification"
                    >
                        <Check size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Report Modal */}
            <AnimatePresence>
                {reportOpen && (
                    <>
                        <div
                            onClick={() => setReportOpen(false)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                                zIndex: 9998,
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '90%', maxWidth: '420px',
                                background: '#2b2d31', borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 9999, padding: '24px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                                    <Flag size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#da373c' }} />
                                    Report Post
                                </h3>
                                <button
                                    onClick={() => setReportOpen(false)}
                                    style={{ color: '#949ba4', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ fontSize: '13px', color: '#949ba4', marginBottom: '12px' }}>
                                Tell us why this post should be reviewed. Reports are anonymous.
                            </p>
                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Describe the issue..."
                                rows={4}
                                style={{
                                    width: '100%', background: '#1e1f22', border: '1px solid #3f4147',
                                    borderRadius: '8px', color: '#f2f3f5', fontSize: '14px',
                                    padding: '10px 12px', resize: 'vertical', outline: 'none',
                                    fontFamily: 'inherit',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button
                                    onClick={() => setReportOpen(false)}
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
                                    onClick={handleReport}
                                    disabled={reportSubmitting || !reportReason.trim()}
                                    style={{
                                        padding: '8px 20px', borderRadius: '6px',
                                        background: '#da373c', color: '#fff',
                                        fontSize: '14px', fontWeight: 600,
                                        border: 'none', cursor: reportReason.trim() ? 'pointer' : 'default',
                                        opacity: reportReason.trim() ? 1 : 0.5,
                                    }}
                                >
                                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
