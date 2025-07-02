import { DocumentVersion } from '@/app/documentation/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class VersionsCache {
  private cache: Map<string, CacheEntry<DocumentVersion[]>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: DocumentVersion[], ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): DocumentVersion[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private generateKey(documentId: string): string {
    return `versions_${documentId}`;
  }

  getVersions(documentId: string): DocumentVersion[] | null {
    return this.get(this.generateKey(documentId));
  }

  setVersions(documentId: string, versions: DocumentVersion[], ttl?: number): void {
    this.set(this.generateKey(documentId), versions, ttl);
  }

  invalidateVersions(documentId: string): void {
    this.invalidate(this.generateKey(documentId));
  }
}

export const versionsCache = new VersionsCache();

export const fetchDocumentVersionsWithCache = async (
  documentId: string,
  apiBaseUrl: string
): Promise<DocumentVersion[]> => {
  // Check cache first
  const cached = versionsCache.getVersions(documentId);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/versions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch document versions: ${response.statusText}`);
  }

  const versions: DocumentVersion[] = await response.json();
  
  // Cache the result
  versionsCache.setVersions(documentId, versions);
  
  return versions;
};