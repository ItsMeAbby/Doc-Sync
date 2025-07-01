// Types for Edit Documentation API
// These should be generated from OpenAPI schema, but defining manually for now

export interface ContentChange {
  old_string: string;
  new_string: string;
}

export interface DocumentEdit {
  document_id: string;
  changes: ContentChange[];
  version: string;
}

export interface GeneratedDocument {
  name: string;
  path: string;
  title: string;
  parent_id: string | null;
  is_api_ref: boolean;
  markdown_content_en: string;
  markdown_content_ja: string;
}

export interface EditDocumentationResponse {
  edit?: DocumentEdit[];
  create?: GeneratedDocument[];
}

export interface EditDocumentationRequest {
  query: string;
  document_id?: string;
}
export interface OriginalContent {
  markdown_content: string;
  language?: string;
  name?: string;
  title?: string;
  path?: string;
}