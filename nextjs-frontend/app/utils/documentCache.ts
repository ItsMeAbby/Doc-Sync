interface CacheEntry {
  data: any;
  timestamp: number;
}

class DocumentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache duration

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Force refresh by removing the cache entry
  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

// Create a singleton instance
export const documentCache = new DocumentCache();

// Helper function to fetch documents with caching
export async function fetchDocumentsWithCache(apiBaseUrl: string): Promise<any> {
  const cacheKey = 'documents_all';
  
  // Check cache first
  const cached = documentCache.get(cacheKey);
  if (cached) {
    console.log('Returning cached documents');
    return cached;
  }

  // Fetch from API if not in cache
  console.log('Fetching documents from API');
  const response = await fetch(`${apiBaseUrl}/api/documents/`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Store in cache
  documentCache.set(cacheKey, data);
  
  return data;
}