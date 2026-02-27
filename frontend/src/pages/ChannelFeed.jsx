import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal, Flame, Clock, ArrowBigUp } from 'lucide-react';
import PostCard from '../components/posts/PostCard';
import CreatePostModal from '../components/posts/CreatePostModal';
import { posts, channels } from '../data/mockData';

const sortOptions = [
    { id: 'urgency', label: 'Urgency', icon: Flame },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'upvotes', label: 'Most Upvoted', icon: ArrowBigUp },
];

export default function ChannelFeed() {
    const { channelId } = useParams();
    const [sortBy, setSortBy] = useState('urgency');
    const [showModal, setShowModal] = useState(false);

    // Find channel info
    const channelInfo = useMemo(() => {
        for (const cat of channels) {
            const sub = cat.subChannels.find(s => s.id === channelId);
            if (sub) return { ...sub, category: cat };
        }
        return { name: channelId, description: '', category: null };
    }, [channelId]);

    // Filter & sort posts
    const filteredPosts = useMemo(() => {
        let filtered = posts.filter(p => p.channelId === channelId);

        // If no posts for this specific channel, show category posts
        if (filtered.length === 0 && channelInfo.category) {
            const subIds = channelInfo.category.subChannels.map(s => s.id);
            filtered = posts.filter(p => subIds.includes(p.channelId));
        }

        // If still no posts, show all posts
        if (filtered.length === 0) {
            filtered = [...posts];
        }

        switch (sortBy) {
            case 'urgency':
                return filtered.sort((a, b) => b.urgencyScore - a.urgencyScore);
            case 'newest':
                return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'upvotes':
                return filtered.sort((a, b) => b.upvotes - a.upvotes);
            default:
                return filtered;
        }
    }, [channelId, sortBy, channelInfo]);

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
                background: '#313338',
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
                                }}
                            >
                                <Icon size={12} />
                                {opt.label}
                            </button>
                        );
                    })}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '12px', color: '#949ba4' }}>
                        {filteredPosts.length} grievances
                    </span>
                </div>
            </div>

            {/* Posts list */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
            }}>
                {filteredPosts.map((post, idx) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <PostCard post={post} />
                    </motion.div>
                ))}

                {filteredPosts.length === 0 && (
                    <div style={{
                        padding: '64px 24px',
                        textAlign: 'center',
                        color: '#949ba4',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
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
                defaultChannel={channelId}
            />
        </div>
    );
}
