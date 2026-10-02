/**
 * Lightweight In-Memory Client Cache for Static / Semi-Static Reference Data
 * (Departments, Sections, Companies, Test Types, Question Metadata)
 * Prevents redundant HTTP requests on every component mount or filter click.
 */
class ClientCache {
  constructor(defaultTtlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  /**
   * Helper to fetch with cache: if in cache return, else call fetcher and cache result
   */
  async getOrFetch(key, fetcher, ttlMs = this.defaultTtlMs) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetcher();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}

export const cacheService = new ClientCache();
export default cacheService;
