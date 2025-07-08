import { apiClient } from "./client";

export interface DocumentVersion {
  version: string;
  document_id: string;
  language: string;
  markdown_content: string;
  keywords_array: string[];
  urls_array: string[];
  summary: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

/**
 * API service for document version operations
 */
export const versionsApi = {
  /**
   * Fetch all versions of a document
   */
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return apiClient.get(`/api/documents/${documentId}/versions`);
  },

  /**
   * Fetch a specific version of a document
   */
  async getDocumentVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
    try {
      return await apiClient.get(`/api/documents/${documentId}/versions/${versionId}`);
    } catch (error) {
      // Fallback to latest version if specific version not found
      return await apiClient.get(`/api/documents/${documentId}/versions/latest`);
    }
  },

  /**
   * Get the latest version of a document
   */
  async getLatestDocumentVersion(documentId: string): Promise<DocumentVersion> {
    return this.getDocumentVersion(documentId, "latest");
  },
};

/**
 * Cache management for document versions
 */
interface VersionsCacheEntry {
  data: DocumentVersion[];
  timestamp: number;
}

class VersionsCache {
  private cache: Map<string, VersionsCacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache duration

  set(documentId: string, data: DocumentVersion[]): void {
    this.cache.set(documentId, {
      data,
      timestamp: Date.now(),
    });
  }

  get(documentId: string): DocumentVersion[] | null {
    const entry = this.cache.get(documentId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(documentId);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(documentId: string): void {
    this.cache.delete(documentId);
  }
}

const versionsCache = new VersionsCache();

/**
 * Fetch document versions with caching
 */
export async function fetchDocumentVersionsWithCache(documentId: string): Promise<DocumentVersion[]> {
  // Check cache first
  const cached = versionsCache.get(documentId);
  if (cached) {
    console.log(`Returning cached versions for document ${documentId}`);
    return cached;
  }

  // Fetch from API if not in cache
  console.log(`Fetching versions from API for document ${documentId}`);
  const data = await versionsApi.getDocumentVersions(documentId);

  // Store in cache
  versionsCache.set(documentId, data);

  return data;
}

/**
 * Invalidate versions cache for a document
 */
export function invalidateVersionsCache(documentId: string): void {
  versionsCache.invalidate(documentId);
  console.log(`Versions cache invalidated for document ${documentId}`);
}

/**
 * Force refresh versions cache for a document
 */
export async function refreshVersionsCache(documentId: string): Promise<DocumentVersion[]> {
  // First invalidate the cache
  invalidateVersionsCache(documentId);

  // Then fetch fresh data
  return await fetchDocumentVersionsWithCache(documentId);
}