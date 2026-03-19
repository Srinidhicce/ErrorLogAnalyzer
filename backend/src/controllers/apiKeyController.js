const User = require('../models/User');
const { encrypt, decrypt, maskApiKey } = require('../utils/encryption');
const { PROVIDER_MODELS } = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * @route GET /api/apikeys
 */
const getApiKeys = async (req, res) => {
  const user = await User.findById(req.user._id);
  const safeKeys = user.apiKeys.map((k) => ({
    _id: k._id,
    provider: k.provider,
    label: k.label,
    maskedKey: k.maskedKey,
    isActive: k.isActive,
    lastUsed: k.lastUsed,
    usageCount: k.usageCount,
    createdAt: k.createdAt
  }));
  res.json({ success: true, apiKeys: safeKeys });
};

/**
 * @route POST /api/apikeys
 */
const addApiKey = async (req, res, next) => {
  try {
    const { provider, apiKey, label } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, message: 'Provider and API key are required' });
    }

    const validProviders = ['openai', 'gemini', 'anthropic', 'openrouter', 'cohere', 'mistral'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Invalid provider. Supported: ${validProviders.join(', ')}` });
    }

    const user = await User.findById(req.user._id);

    // Check if key for this provider already exists
    const existingIndex = user.apiKeys.findIndex((k) => k.provider === provider.toLowerCase());

    const encryptedKey = encrypt(apiKey.trim());
    const maskedKey = maskApiKey(apiKey.trim());

    if (existingIndex !== -1) {
      // Update existing
      user.apiKeys[existingIndex].encryptedKey = encryptedKey;
      user.apiKeys[existingIndex].maskedKey = maskedKey;
      user.apiKeys[existingIndex].label = label || user.apiKeys[existingIndex].label;
      user.apiKeys[existingIndex].isActive = true;
    } else {
      // Add new
      user.apiKeys.push({
        provider: provider.toLowerCase(),
        encryptedKey,
        maskedKey,
        label: label || `${provider} API Key`
      });
    }

    await user.save();
    logger.info(`API key saved for provider ${provider} by user ${req.user._id}`);

    res.json({
      success: true,
      message: `${provider} API key saved successfully`,
      apiKeys: user.apiKeys.map((k) => ({
        _id: k._id, provider: k.provider, label: k.label,
        maskedKey: k.maskedKey, isActive: k.isActive, lastUsed: k.lastUsed,
        usageCount: k.usageCount, createdAt: k.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/apikeys/:keyId
 */
const deleteApiKey = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const keyIndex = user.apiKeys.findIndex((k) => k._id.toString() === req.params.keyId);

    if (keyIndex === -1) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    user.apiKeys.splice(keyIndex, 1);
    await user.save();

    res.json({ success: true, message: 'API key deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/apikeys/:keyId/toggle
 */
const toggleApiKey = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const key = user.apiKeys.id(req.params.keyId);

    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    key.isActive = !key.isActive;
    await user.save();

    res.json({ success: true, message: `API key ${key.isActive ? 'enabled' : 'disabled'}`, isActive: key.isActive });
  } catch (error) {
    next(error);
  }
};

/**
 * Get decrypted API key for internal use (not exposed as route)
 */
const getDecryptedApiKey = async (userId, provider) => {
  const user = await User.findById(userId);
  const keyEntry = user.apiKeys.find((k) => k.provider === provider.toLowerCase() && k.isActive);
  if (!keyEntry) throw new Error(`No active API key found for provider: ${provider}`);
  return decrypt(keyEntry.encryptedKey);
};

/**
 * @route GET /api/apikeys/providers
 */
const getProviders = (req, res) => {
  res.json({
    success: true,
    providers: Object.entries(PROVIDER_MODELS).map(([id, models]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      models
    }))
  });
};

module.exports = { getApiKeys, addApiKey, deleteApiKey, toggleApiKey, getDecryptedApiKey, getProviders };
