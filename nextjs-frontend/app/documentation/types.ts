export interface DocumentNode {
  id: string;
  name: string;
  title?: string;
  path?: string;
  is_api_ref: boolean;
  parent_id?: string;
  created_at: string;
  current_version_id?: string;
  is_deleted: boolean;
  markdown_content?: string;
  language?: string;
  keywords_array?: string[];
  children?: DocumentNode[];
}

export interface DocumentVersion {
  version: string; // UUID
  document_id: string; // UUID
  markdown_content: string; // Content
  language?: string; // Language code
  keywords_array?: string[]; // Auto-generated keywords
  urls_array?: string[]; // Auto-extracted URLs
  summary?: string; // Auto-generated summary
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  name?: string; // From document metadata
  path?: string; // From document metadata
  title?: string; // From document metadata
  latest?: boolean; // Flag to indicate if this is the current/latest version
}

export interface GetAllDocumentsResponse {
  [language: string]: {
    documentation: DocumentNode[];
    api_references: DocumentNode[];
  };
}
