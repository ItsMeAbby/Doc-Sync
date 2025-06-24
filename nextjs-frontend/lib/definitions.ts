import { z } from "zod";

export const documentUpdateSchema = z.object({
  updateQuery: z.string().min(1, { message: "Update description is required" }),
  documentId: z.string().optional(),
});

export const documentSuggestionSchema = z.object({
  documentId: z.string(),
  originalContent: z.string(),
  suggestedContent: z.string(),
  reason: z.string(),
});