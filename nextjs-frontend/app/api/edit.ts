import { apiClient } from "./client";

export interface EditDocumentationRequest {
  query: string;
  language: string;
  document_id?: string;
  document_mentions?: string[];
}

export interface EditDocumentationResponse {
  edit: DocumentEdit[];
}

export interface DocumentEdit {
  document_id: string;
  changes: TextChange[];
  version: string;
}

export interface TextChange {
  old_string: string;
  new_string: string;
}

export interface InlineEditRequest {
  selected_text: string;
  query: string;
}

export interface InlineEditResponse {
  suggestion: string;
  explanation?: string;
}

export interface UpdateDocumentationRequest {
  document_id: string;
  version_id: string;
  changes: TextChange[];
  new_language?: string;
}

export interface UpdateDocumentationResponse {
  success: boolean;
  new_version_id: string;
  message?: string;
}

/**
 * API service for AI-powered editing operations
 */
export const editApi = {
  /**
   * Get AI-powered documentation edit suggestions
   */
  async getEditSuggestions(data: EditDocumentationRequest): Promise<EditDocumentationResponse> {
    return apiClient.post("/api/edit/", data);
  },

  /**
   * Get inline edit suggestion for selected text
   */
  async getInlineEditSuggestion(data: InlineEditRequest): Promise<InlineEditResponse> {
    return apiClient.post("/api/edit/inline_edit", data);
  },

  /**
   * Apply suggested changes to documentation
   */
  async updateDocumentation(data: UpdateDocumentationRequest): Promise<UpdateDocumentationResponse> {
    return apiClient.post("/api/edit/update_documentation", data);
  },
};