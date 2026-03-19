const express = require('express');
const router = express.Router();

const {
  getApiKeys,
  addApiKey,
  deleteApiKey,
  toggleApiKey,
  getProviders
} = require('../controllers/apiKeyController');
const { protect } = require('../middleware/auth');

// All API key routes require auth
router.use(protect);

router.get('/providers', getProviders);     // GET  /api/apikeys/providers
router.get('/', getApiKeys);                // GET  /api/apikeys
router.post('/', addApiKey);               // POST /api/apikeys
router.delete('/:keyId', deleteApiKey);    // DELETE /api/apikeys/:keyId
router.patch('/:keyId/toggle', toggleApiKey); // PATCH /api/apikeys/:keyId/toggle

module.exports = router;
