import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gravit_analytics';

  try {
    await mongoose.connect(uri);
    return mongoose.connection;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed (analytics will be disabled):', err.message);
    return null;
  }
}

// ─── Analytics Schemas ──────────────────────────────

const urgencyLogSchema = new mongoose.Schema({
  postId: { type: String, required: true, index: true },
  score: { type: Number, required: true },
  upvoteCount: Number,
  timestamp: { type: Date, default: Date.now },
});

const escalationLogSchema = new mongoose.Schema({
  postId: { type: String, required: true, index: true },
  level: Number,
  triggerType: { type: String, enum: ['threshold', 'dead_mans_switch', 'resolution_rejected'] },
  triggeredAt: { type: Date, default: Date.now },
  notifiedEmail: String,
});

const dashboardCacheSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

export const UrgencyLog = mongoose.model('UrgencyLog', urgencyLogSchema);
export const EscalationLog = mongoose.model('EscalationLog', escalationLogSchema);
export const DashboardCache = mongoose.model('DashboardCache', dashboardCacheSchema);
