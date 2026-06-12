// Simple cache module for data invalidation

let cacheInvalidated = true;

export function isCacheInvalidated() {
  return cacheInvalidated;
}

export function clearCache() {
  cacheInvalidated = true;
}

export function markCacheFresh() {
  cacheInvalidated = false;
}
