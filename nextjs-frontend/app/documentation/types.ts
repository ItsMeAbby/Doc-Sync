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

export interface GetAllDocumentsResponse {
  [language: string]: {
    documentation: DocumentNode[];
    api_references: DocumentNode[];
  };
}