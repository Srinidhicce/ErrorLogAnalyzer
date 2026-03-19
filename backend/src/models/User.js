const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { maskApiKey } = require('../utils/encryption');

const ApiKeySchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['openai', 'gemini', 'anthropic', 'openrouter', 'cohere', 'mistral'],
    lowercase: true
  },
  encryptedKey: { type: String, required: true },
  label: { type: String, default: '' },
  maskedKey: { type: String },
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  apiKeys: [ApiKeySchema],
  preferences: {
    defaultProvider: { type: String, default: 'openai' },
    enableCaching: { type: Boolean, default: true },
    maskingEnabled: { type: Boolean, default: true }
  },
  stats: {
    totalAnalyses: { type: Number, default: 0 },
    cacheHits: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;

  if (obj.apiKeys) {
    obj.apiKeys = obj.apiKeys.map((k) => ({
      _id: k._id,
      provider: k.provider,
      label: k.label,
      maskedKey: k.maskedKey,
      isActive: k.isActive,
      lastUsed: k.lastUsed,
      usageCount: k.usageCount,
      createdAt: k.createdAt
    }));
  }
  return obj;
};

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'apiKeys.provider': 1 });

module.exports = mongoose.model('User', UserSchema);