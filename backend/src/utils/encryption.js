const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_change_in_production!!';


const encrypt = (text) => {
  if (!text) return null;
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    throw new Error('Encryption failed');
  }
};


const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error('Decryption produced empty result');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
};


const maskApiKey = (key) => {
  if (!key || key.length < 8) return '****';
  return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
};

module.exports = { encrypt, decrypt, maskApiKey };