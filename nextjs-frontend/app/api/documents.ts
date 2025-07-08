import { apiClient } from "./client";

export interface Document {
  id: string;
  name: string;
  title: string;
  path: string;
  is_api_ref: boolean;
  parent_id?: string;
  current_version_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  children?: Document[];
}

export interface DocumentContent {
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

export interface CreateDocumentRequest {
  name: string;
  title: string;
  path: string;
  is_api_ref?: boolean;
  parent_id?: string;
  language?: string;
  markdown_content?: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  title?: string;
  path?: string;
  is_api_ref?: boolean;
  parent_id?: string;
  is_deleted?: boolean;
}

export interface CreateVersionRequest {
  language: string;
  markdown_content: string;
}

/**
 * API service for document operations
 */
export const documentsApi = {
  /**
   * Get all documents with hierarchy and content
   */
  async getAllDocuments(): Promise<any> {
    return apiClient.get("/api/documents/");
  },

  /**
   * Get root-level documents
   */
  async getRootDocuments(): Promise<Document[]> {
    return apiClient.get("/api/documents/root");
  },

  /**
   * Get document by ID with metadata and latest version
   */
  async getDocument(documentId: string): Promise<Document> {
    return apiClient.get(`/api/documents/${documentId}`);
  },

  /**
   * Get child documents of a parent document
   */
  async getChildDocuments(parentId: string): Promise<Document[]> {
    return apiClient.get(`/api/documents/${parentId}/children`);
  },

  /**
   * Get document lineage (parents chain)
   */
  async getDocumentParents(documentId: string): Promise<Document[]> {
    return apiClient.get(`/api/documents/${documentId}/parents`);
  },

  /**
   * Create a new document
   */
  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    return apiClient.post("/api/documents/", data);
  },

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, data: UpdateDocumentRequest): Promise<Document> {
    return apiClient.put(`/api/documents/${documentId}`, data);
  },

  /**
   * Create a new version of a document
   */
  async createDocumentVersion(documentId: string, data: CreateVersionRequest): Promise<DocumentContent> {
    return apiClient.post(`/api/documents/${documentId}/versions`, data);
  },
};

/**
 * Cache management for documents
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

class DocumentsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache duration

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
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

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

const documentsCache = new DocumentsCache();

/**
 * Fetch documents with caching
 */
export async function fetchDocumentsWithCache(): Promise<any> {
  const cacheKey = "documents_all";

  // Check cache first
  const cached = documentsCache.get(cacheKey);
  if (cached) {
    console.log("Returning cached documents");
    return cached;
  }

  // Fetch from API if not in cache
  console.log("Fetching documents from API");
  const data = await documentsApi.getAllDocuments();

  // Store in cache
  documentsCache.set(cacheKey, data);

  return data;
}

/**
 * Invalidate document cache after updates
 */
export function invalidateDocumentCache(): void {
  const cacheKey = "documents_all";
  documentsCache.invalidate(cacheKey);
  console.log("Document cache invalidated");
}

/**
 * Force refresh documents cache
 */
export async function refreshDocumentCache(): Promise<any> {
  // First invalidate the cache
  invalidateDocumentCache();

  // Then fetch fresh data
  return await fetchDocumentsWithCache();
}