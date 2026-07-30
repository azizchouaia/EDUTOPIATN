/**
 * Tiny in-memory TTL cache.
 *
 * Usage:
 *   const { getCache, setCache, invalidateCache } = require('../utils/cache');
 *
 *   // in a route handler:
 *   const cached = getCache('products');
 *   if (cached) return res.json(cached);
 *   const data = await fetchFromDB();
 *   setCache('products', data, 60);   // 60-second TTL
 *   res.json(data);
 *
 * Call invalidateCache('products') after any write so the next read is fresh.
 */

const _store = new Map(); // key → { value, expiresAt }

/**
 * Retrieve a cached value. Returns undefined (falsy) if missing or expired.
 * @param {string} key
 * @returns {any|undefined}
 */
function getCache(key) {
  const entry = _store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Store a value under key for ttlSeconds seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=60]
 */
function setCache(key, value, ttlSeconds = 60) {
  _store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Remove a key immediately (call after writes to the underlying data).
 * @param {string} key
 */
function invalidateCache(key) {
  _store.delete(key);
}

/**
 * Remove all keys that start with a given prefix — useful for namespaced keys.
 * @param {string} prefix
 */
function invalidateCacheByPrefix(prefix) {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
}

module.exports = { getCache, setCache, invalidateCache, invalidateCacheByPrefix };
