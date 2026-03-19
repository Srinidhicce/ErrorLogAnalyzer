const mongoose = require('mongoose');

const ErrorEntrySchema = new mongoose.Schema({
  lineNumber: Number,
  content: String,
  severity: { type: String, enum: ['CRITICAL', 'ERROR', 'WARNING', 'INFO'] },
  category: String,
  count: { type: Number, default: 1 },
  normalizedKey: String
}, { _id: false });

const AnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Input metadata
  inputType: { type: String, enum: ['file', 'text'], required: true },
  fileName: String,
  fileSize: Number,
  originalHash: { type: String, required: true, index: true },

  // Processing
  provider: { type: String, required: true },
  model: String,
  cacheHit: { type: Boolean, default: false },
  processingTimeMs: Number,

  // Masking
  maskingSummary: { type: Map, of: Number, default: {} },
  totalMasked: { type: Number, default: 0 },
  maskedContentPreview: String, // First 500 chars of masked content

  // Errors
  totalErrors: { type: Number, default: 0 },
  repeatedErrors: [ErrorEntrySchema],
  nonRepeatedErrors: [ErrorEntrySchema],
  errorsByCategory: { type: Map, of: Number, default: {} },
  errorsBySeverity: { type: Map, of: Number, default: {} },

  // AI Analysis
  aiAnalysis: {
    rootCause: String,
    errorSummary: String,
    suggestedFixes: [String],
    criticalIssues: [String],
    overallHealth: { type: String, enum: ['healthy', 'warning', 'critical', 'unknown'] },
    confidence: Number,
    rawResponse: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String

}, { timestamps: true });


AnalysisSchema.index({ userId: 1, createdAt: -1 });
AnalysisSchema.index({ originalHash: 1, provider: 1 });

module.exports = mongoose.model('Analysis', AnalysisSchema);