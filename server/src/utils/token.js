const crypto = require('crypto');
const env = require('../config/env');

const secretKey = env.SESSION_SECRET || 'insightai_fallback_secret_for_token_signing_key_32c';

/**
 * Generate a signed, time-limited authentication token for cross-domain sessions
 */
const createAuthToken = (userId) => {
  const idStr = String(userId);
  const payload = Buffer.from(
    JSON.stringify({
      id: idStr,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
  ).toString('base64url');

  const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

/**
 * Verify and decode an authentication token
 */
const verifyAuthToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSig = crypto.createHmac('sha256', secretKey).update(payload).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data.id;
  } catch (e) {
    return null;
  }
};

module.exports = {
  createAuthToken,
  verifyAuthToken,
};

