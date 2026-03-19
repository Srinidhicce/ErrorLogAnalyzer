const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  analyzeText,
  analyzeFile,
  getHistory,
  getAnalysisById,
  deleteAnalysis,
  exportPDF,
  getUserStats,
  maskPreview
} = require('../controllers/analysisController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');


const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'Too many analysis requests. Please slow down.' },
  skip: (req) => req.user?.role === 'admin'
});

const aiCallLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'AI call limit reached. Please wait before making more requests.' },
  skip: (req) => req.user?.role === 'admin'
});


router.use(protect);


router.get('/stats/summary', getUserStats);        // GET  /api/analysis/stats/summary
router.post('/mask-preview', analysisLimiter, maskPreview); // POST /api/analysis/mask-preview


router.post('/text', aiCallLimiter, analyzeText);  // POST /api/analysis/text
router.post(
  '/file',
  aiCallLimiter,
  (req, res, next) => {
    upload.single('logFile')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  analyzeFile
); // POST /api/analysis/file


router.get('/history', getHistory);                // GET  /api/analysis/history
router.get('/:id', getAnalysisById);              // GET  /api/analysis/:id
router.delete('/:id', deleteAnalysis);            // DELETE /api/analysis/:id
router.get('/:id/export', exportPDF);             // GET  /api/analysis/:id/export

module.exports = router;
