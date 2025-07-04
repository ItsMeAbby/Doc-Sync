import { DocumentVersion } from '@/app/documentation/types';
import { fetchDocumentVersionsWithCache } from '@/app/utils/versionsCache';

export const documentVersionsApi = {
  /**
   * Fetch all versions of a document with caching
   */
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    return fetchDocumentVersionsWithCache(documentId, apiBaseUrl);
  },

  /**
   * Fetch a specific version of a document
   */
  async getDocumentVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/versions/${versionId}`);
    
    if (!response.ok) {
      const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/versions/latest`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document version: ${response.statusText}`);
      }
    }

    return response.json();
  },

  /**
   * Get the latest version of a document
   */
  async getLatestDocumentVersion(documentId: string): Promise<DocumentVersion> {
    return this.getDocumentVersion(documentId, 'latest');
  },
};