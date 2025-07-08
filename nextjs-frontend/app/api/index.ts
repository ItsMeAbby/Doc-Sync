/**
 * Centralized API exports for the frontend application
 */

// API Client
export { apiClient } from "./client";

// API Services
export * from "./documents";
export * from "./edit";
export * from "./versions";

// Types
export type {
  Document,
  DocumentContent,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateVersionRequest,
} from "./documents";

export type {
  EditDocumentationRequest,
  EditDocumentationResponse,
  DocumentEdit,
  TextChange,
  InlineEditRequest,
  InlineEditResponse,
  UpdateDocumentationRequest,
  UpdateDocumentationResponse,
} from "./edit";

export type {
  DocumentVersion,
} from "./versions";