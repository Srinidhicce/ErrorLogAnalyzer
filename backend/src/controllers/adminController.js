const User = require('../models/User');
const Analysis = require('../models/Analysis');
const Cache = require('../models/Cache');
const { getCacheStats } = require('../services/cacheService');
const logger = require('../utils/logger');


const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalAnalyses,
      cacheHits,
      providerBreakdown,
      dailyActivity,
      topUsers,
      cacheStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Analysis.countDocuments({ status: 'completed' }),
      Analysis.countDocuments({ cacheHit: true }),

      Analysis.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 }, avgTime: { $avg: '$processingTimeMs' } } },
        { $sort: { count: -1 } }
      ]),

      Analysis.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      Analysis.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { count: 1, 'user.name': 1, 'user.email': 1 } }
      ]),

      getCacheStats()
    ]);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers },
        analyses: {
          total: totalAnalyses,
          cacheHits,
          cacheHitRate: totalAnalyses > 0 ? Math.round((cacheHits / totalAnalyses) * 100) : 0
        },
        providerBreakdown,
        dailyActivity,
        topUsers,
        cache: cacheStats
      }
    });
  } catch (error) {
    next(error);
  }
};


const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -resetPasswordToken'),
      User.countDocuments(filter)
    ]);

    const userIds = users.map((u) => u._id);
    const analysisCounts = await Analysis.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(analysisCounts.map((a) => [a._id.toString(), a.count]));

    const usersWithStats = users.map((u) => ({
      ...u.toSafeObject(),
      analysisCount: countMap[u._id.toString()] || 0
    }));

    res.json({
      success: true,
      data: usersWithStats,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};


const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [analyses, analysisCount] = await Promise.all([
      Analysis.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).select('-aiAnalysis.rawResponse'),
      Analysis.countDocuments({ userId: user._id })
    ]);

    res.json({ success: true, data: { ...user.toSafeObject(), recentAnalyses: analyses, analysisCount } });
  } catch (error) {
    next(error);
  }
};


const toggleUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    logger.info(`Admin ${req.user.email} ${user.isActive ? 'activated' : 'deactivated'} user ${user.email}`);

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be user or admin' });
    }
    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot remove your own admin role' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.info(`Admin ${req.user.email} updated role of ${user.email} to ${role}`);
    res.json({ success: true, message: `Role updated to ${role}`, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};


const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

 
    await Analysis.deleteMany({ userId: req.params.id });

    logger.warn(`Admin ${req.user.email} deleted user ${user.email} and all their analyses`);
    res.json({ success: true, message: 'User and all associated data deleted' });
  } catch (error) {
    next(error);
  }
};


const getAllAnalyses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.provider) filter.provider = req.query.provider;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.cacheHit !== undefined) filter.cacheHit = req.query.cacheHit === 'true';

    const [analyses, total] = await Promise.all([
      Analysis.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-aiAnalysis.rawResponse -maskedContentPreview'),
      Analysis.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: analyses,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};


const clearCache = async (req, res, next) => {
  try {
    const { all } = req.query;
    let result;

    if (all === 'true') {
      result = await Cache.deleteMany({});
      logger.warn(`Admin ${req.user.email} cleared ALL cache entries`);
    } else {
      result = await Cache.deleteMany({ expiresAt: { $lt: new Date() } });
    }

    res.json({
      success: true,
      message: `${result.deletedCount} cache entries cleared`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  updateUserRole,
  deleteUser,
  getAllAnalyses,
  clearCache
};
