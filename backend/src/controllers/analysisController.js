const fs = require('fs');
const path = require('path');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { maskSensitiveData, extractErrors, categorizeRepeatedErrors, generateCacheKey } = require('../utils/logProcessor');
const { analyzeWithAI } = require('../services/aiService');
const { getCached, setCached } = require('../services/cacheService');
const { getDecryptedApiKey } = require('./apiKeyController');
const { generatePDFReport } = require('../services/pdfService');
const { cleanupFile } = require('../middleware/upload');
const logger = require('../utils/logger');

/**
 * Core analysis pipeline
 */
const runAnalysisPipeline = async ({ userId, content, inputType, fileName, fileSize, provider, model, enableCaching }) => {
  // Step 1 — Mask sensitive data
  const { maskedContent, maskingSummary, totalMasked, originalHash } = maskSensitiveData(content);

  // Step 2 — Extract & categorize errors
  const allErrors = extractErrors(maskedContent);
  const { repeated, nonRepeated } = categorizeRepeatedErrors(allErrors);

  // Step 3 — Build error stats
  const errorsByCategory = {};
  const errorsBySeverity = {};
  allErrors.forEach(({ category, severity }) => {
    errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
    errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
  });

  // Step 4 — Check cache
  const cacheKey = generateCacheKey(maskedContent, provider);
  let aiAnalysis = null;
  let cacheHit = false;

  if (enableCaching !== false) {
    const cached = await getCached(cacheKey);
    if (cached) {
      aiAnalysis = cached;
      cacheHit = true;
      logger.info(`Cache hit for key: ${cacheKey.substring(0, 32)}...`);
    }
  }

  // Step 5 — Call AI if no cache
  let processingTimeMs = 0;
  if (!aiAnalysis) {
    const apiKey = await getDecryptedApiKey(userId, provider);
    const result = await analyzeWithAI({ provider, apiKey, maskedContent, errors: allErrors, repeatedErrors: repeated, model });
    processingTimeMs = result.processingTimeMs || 0;
    aiAnalysis = result;

    // Store in cache
    if (enableCaching !== false) {
      await setCached(cacheKey, aiAnalysis, provider);
    }
  }

  // Step 6 — Persist analysis record
  const analysis = await Analysis.create({
    userId,
    inputType,
    fileName,
    fileSize,
    originalHash,
    provider,
    model: aiAnalysis.model || model,
    cacheHit,
    processingTimeMs,
    maskingSummary,
    totalMasked,
    maskedContentPreview: maskedContent.substring(0, 500),
    totalErrors: allErrors.length,
    repeatedErrors: repeated.slice(0, 50),
    nonRepeatedErrors: nonRepeated.slice(0, 50),
    errorsByCategory,
    errorsBySeverity,
    aiAnalysis,
    status: 'completed'
  });

  // Step 7 — Update user stats
  await User.findByIdAndUpdate(userId, {
    $inc: {
      'stats.totalAnalyses': 1,
      ...(cacheHit ? { 'stats.cacheHits': 1 } : {})
    }
  });

  // Step 8 — Update API key usage
  if (!cacheHit) {
    const user = await User.findById(userId);
    const keyEntry = user.apiKeys.find((k) => k.provider === provider.toLowerCase() && k.isActive);
    if (keyEntry) {
      keyEntry.lastUsed = new Date();
      keyEntry.usageCount += 1;
      await user.save({ validateBeforeSave: false });
    }
  }

  return {
    analysisId: analysis._id,
    cacheHit,
    processingTimeMs,
    maskedContent,
    maskingSummary,
    totalMasked,
    totalErrors: allErrors.length,
    repeatedErrors: repeated,
    nonRepeatedErrors: nonRepeated,
    errorsByCategory,
    errorsBySeverity,
    aiAnalysis,
    provider,
    model: aiAnalysis.model || model,
    inputType,
    fileName,
    createdAt: analysis.createdAt
  };
};

/**
 * @route POST /api/analysis/text
 * Analyze pasted raw text log
 */
const analyzeText = async (req, res, next) => {
  try {
    const { content, provider, model, enableCaching } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Log content is required' });
    }
    if (!provider) {
      return res.status(400).json({ success: false, message: 'AI provider is required' });
    }
    if (content.length > 500000) {
      return res.status(400).json({ success: false, message: 'Content too large. Maximum 500KB.' });
    }

    const result = await runAnalysisPipeline({
      userId: req.user._id,
      content: content.trim(),
      inputType: 'text',
      provider,
      model,
      enableCaching
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Text analysis error:', error.message);
    next(error);
  }
};

/**
 * @route POST /api/analysis/file
 * Analyze uploaded log file
 */
const analyzeFile = async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { provider, model, enableCaching } = req.body;
    if (!provider) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: 'AI provider is required' });
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
    }

    const result = await runAnalysisPipeline({
      userId: req.user._id,
      content,
      inputType: 'file',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      provider,
      model,
      enableCaching
    });

    cleanupFile(filePath);
    res.json({ success: true, data: result });
  } catch (error) {
    cleanupFile(filePath);
    logger.error('File analysis error:', error.message);
    next(error);
  }
};

/**
 * @route GET /api/analysis/history
 * Get paginated analysis history for logged-in user
 */
const getHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.provider) filter.provider = req.query.provider;
    if (req.query.status) filter.status = req.query.status;

    const [analyses, total] = await Promise.all([
      Analysis.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-maskedContentPreview -repeatedErrors -nonRepeatedErrors -aiAnalysis.rawResponse'),
      Analysis.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: analyses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/analysis/:id
 * Get single analysis by ID
 */
const getAnalysisById = async (req, res, next) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/analysis/:id
 */
const deleteAnalysis = async (req, res, next) => {
  try {
    const analysis = await Analysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    res.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/analysis/:id/export
 * Export analysis as PDF
 */
const exportPDF = async (req, res, next) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    const pdfBuffer = await generatePDFReport(analysis.toObject());

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="log-analysis-${analysis._id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF export error:', error.message);
    next(error);
  }
};

/**
 * @route GET /api/analysis/stats/summary
 * Dashboard stats for logged-in user
 */
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalAnalyses,
      cacheHits,
      providerBreakdown,
      recentTrend,
      severityTotals,
      categoryTotals
    ] = await Promise.all([
      Analysis.countDocuments({ userId, status: 'completed' }),

      Analysis.countDocuments({ userId, cacheHit: true }),

      Analysis.aggregate([
        { $match: { userId } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Analysis.aggregate([
        { $match: { userId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      Analysis.aggregate([
        { $match: { userId } },
        { $project: { errorsBySeverity: { $objectToArray: '$errorsBySeverity' } } },
        { $unwind: '$errorsBySeverity' },
        { $group: { _id: '$errorsBySeverity.k', total: { $sum: '$errorsBySeverity.v' } } }
      ]),

      Analysis.aggregate([
        { $match: { userId } },
        { $project: { errorsByCategory: { $objectToArray: '$errorsByCategory' } } },
        { $unwind: '$errorsByCategory' },
        { $group: { _id: '$errorsByCategory.k', total: { $sum: '$errorsByCategory.v' } } },
        { $sort: { total: -1 } },
        { $limit: 8 }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalAnalyses,
        cacheHits,
        cacheHitRate: totalAnalyses > 0 ? Math.round((cacheHits / totalAnalyses) * 100) : 0,
        providerBreakdown,
        recentTrend,
        severityTotals,
        categoryTotals,
        userStats: req.user.stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/analysis/mask-preview
 * Preview masking without running AI (free operation)
 */
const maskPreview = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const { maskedContent, maskingSummary, totalMasked } = maskSensitiveData(content);
    const errors = extractErrors(maskedContent);
    const { repeated, nonRepeated } = categorizeRepeatedErrors(errors);

    res.json({
      success: true,
      data: {
        maskedContent: maskedContent.substring(0, 5000),
        maskingSummary,
        totalMasked,
        totalErrors: errors.length,
        repeatedCount: repeated.length,
        nonRepeatedCount: nonRepeated.length,
        sampleErrors: errors.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeText,
  analyzeFile,
  getHistory,
  getAnalysisById,
  deleteAnalysis,
  exportPDF,
  getUserStats,
  maskPreview
};
