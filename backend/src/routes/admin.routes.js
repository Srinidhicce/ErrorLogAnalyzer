const express = require('express');
const router = express.Router();

const {
  getPlatformStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  updateUserRole,
  deleteUser,
  getAllAnalyses,
  clearCache
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

// Platform stats
router.get('/stats', getPlatformStats);              // GET  /api/admin/stats

// User management
router.get('/users', getAllUsers);                   // GET  /api/admin/users
router.get('/users/:id', getUserById);              // GET  /api/admin/users/:id
router.patch('/users/:id/toggle', toggleUserStatus); // PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/role', updateUserRole);    // PATCH /api/admin/users/:id/role
router.delete('/users/:id', deleteUser);            // DELETE /api/admin/users/:id

// Analyses
router.get('/analyses', getAllAnalyses);             // GET  /api/admin/analyses

// Cache management
router.delete('/cache', clearCache);                // DELETE /api/admin/cache

module.exports = router;
