const mongoose = require('mongoose');

const CacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  provider: String,
  aiAnalysis: { type: mongoose.Schema.Types.Mixed },
  hitCount: { type: Number, default: 0 },
  lastAccessed: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
    index: { expireAfterSeconds: 0 }
  }
}, { timestamps: true });

CacheSchema.methods.incrementHit = async function () {
  this.hitCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

module.exports = mongoose.model('Cache', CacheSchema);