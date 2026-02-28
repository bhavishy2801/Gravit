import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal, Flame, Clock, ArrowBigUp, Loader } from 'lucide-react';
import PostCard from '../components/posts/PostCard';
import CreatePostModal from '../components/posts/CreatePostModal';
import api from '../services/api';

const sortOptions = [
    { id: 'urgency', label: 'Urgency', icon: Flame },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'upvotes', label: 'Most Upvoted', icon: ArrowBigUp },
];

export default function ChannelFeed() {
    const { channelId } = useParams();
    const [sortBy, setSortBy] = useState('urgency');
    const [showModal, setShowModal] = useState(false);
    const [posts, setPosts] = useState([]);
    const [channelInfo, setChannelInfo] = useState({ name: channelId, description: '' });
    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState([]);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/posts', {
                params: { channel: channelId, sort: sortBy },
            });
            setPosts(res.data.posts);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setLoading(false);
        }
    }, [channelId, sortBy]);

    // Fetch channel info + channels list
    useEffect(() => {
        async function fetchChannelInfo() {
            try {
                const [channelRes, channelsRes] = await Promise.all([
                    api.get(`/channels/${channelId}`),
                    api.get('/channels'),
                ]);
                const ch = channelRes.data.channel;
                setChannelInfo({
                    name: ch.name,
                    description: ch.description || '',
                });
                setChannels(channelsRes.data.channels);
            } catch (err) {
                console.error('Failed to load channel info:', err);
            }
        }
        fetchChannelInfo();
    }, [channelId]);

    // Fetch posts when channel or sort changes
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handlePostCreated = () => {
        setShowModal(false);
        fetchPosts();
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* Channel header bar */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: '#1a1b1e',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f2f3f5' }}>
                            # {channelInfo.name}
                        </h2>
                        {channelInfo.description && (
                            <p style={{ fontSize: '13px', color: '#949ba4', marginTop: '2px' }}>
                                {channelInfo.description}
                            </p>
                        )}
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: '#5865f2',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={16} /> New Grievance
                    </motion.button>
                </div>

                {/* Sort controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <SlidersHorizontal size={14} color="#949ba4" />
                    <span style={{ fontSize: '12px', color: '#949ba4', marginRight: '8px' }}>Sort:</span>
                    {sortOptions.map(opt => {
                        const Icon = opt.icon;
                        const active = sortBy === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#f2f3f5' : '#949ba4',
                                    background: active ? '#404249' : 'transparent',
                                    transition: 'all 0.15s',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <Icon size={12} />
                                {opt.label}
                            </button>
                        );
                    })}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '12px', color: '#949ba4' }}>
                        {posts.length} grievances
                    </span>
                </div>
            </div>

            {/* Posts list */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
            }}>
                {loading && (
                    <div style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        color: '#949ba4',
                    }}>
                        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ marginTop: '8px', fontSize: '13px' }}>Loading grievances...</p>
                    </div>
                )}

                {!loading && posts.map((post, idx) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <PostCard post={post} />
                    </motion.div>
                ))}

                {!loading && posts.length === 0 && (
                    <div style={{
                        padding: '64px 24px',
                        textAlign: 'center',
                        color: '#949ba4',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#f2f3f5', marginBottom: '4px' }}>
                            No grievances yet
                        </p>
                        <p style={{ fontSize: '13px' }}>
                            Be the first to raise a concern in this channel.
                        </p>
                    </div>
                )}
            </div>

            {/* Create post modal */}
            <CreatePostModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onCreated={handlePostCreated}
                defaultChannel={channelId}
                channels={channels}
            />
        </div>
    );
}
