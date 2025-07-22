"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { DocumentNode } from "@/app/documentation/types";
import VersionHistoryModal from "./VersionHistoryModal";
import EditModal from "@/components/EditModal";
import { invalidateDocumentCache } from "@/app/utils/documentCache";

interface MarkdownRendererProps {
  content: string;
  documentId?: string;
  keywords_array?: string[];
  isLoading?: boolean;
  document?: DocumentNode;
  onDocumentReverted?: () => void;
  onDocumentDeleted?: () => void;
  onDocumentUpdated?: (documentId: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  documentId,
  keywords_array = [],
  isLoading = false,
  document,
  onDocumentReverted,
  onDocumentDeleted,
  onDocumentUpdated,
}) => {
  const router = useRouter();
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!document?.id) return;

    try {
      setIsDeleting(true);

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(
        `${apiBaseUrl}/api/documents/${document.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_deleted: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      // Call the onDocumentDeleted callback to refresh the parent component
      onDocumentDeleted?.();
    } catch (err) {
      console.error("Failed to delete document:", err);
      // You might want to show a toast or error message here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveContent = (newContent: string) => {
    console.log("Content saved:", newContent);
    // Content is now saved via the EditModal's API call
  };

  const handleDocumentEditUpdated = async () => {
    // Invalidate the document cache first
    invalidateDocumentCache();
    
    // Notify parent about specific document update
    if (document?.id) {
      onDocumentUpdated?.(document.id);
    }
    
    // Refresh the parent component to show updated content
    onDocumentReverted?.();
  };
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Spinner size="sm" />
          <span className="text-sm text-gray-500">
            Loading document content...
          </span>
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center text-gray-500 py-10">
        No content available
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <div className="flex flex-col mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {keywords_array && keywords_array.length > 0
            ? keywords_array.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {keyword}
                </span>
              ))
            : null}
        </div>
        <div className="flex justify-end gap-2">
          {document && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVersionModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Version History
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "
                      {document.title || document.name}"? This action cannot be
                      undone and will permanently remove the document and all
                      its versions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <button
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            onClick={() =>
              router.push(
                `/documentation-change${documentId ? `?documentId=${encodeURIComponent(documentId)}` : ""}`,
              )
            }
          >
            Suggest Update
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 sm:p-4 overflow-x-hidden">
        <ReactMarkdown
          className="prose prose-xs sm:prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm sm:prose-p:text-base prose-pre:text-xs sm:prose-pre:text-sm overflow-x-auto"
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        content={content}
        onSave={handleSaveContent}
        documentId={document?.id}
        onDocumentUpdated={handleDocumentEditUpdated}
      />

      {/* Version History Modal */}
      {document && (
        <VersionHistoryModal
          document={document}
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          onRevert={onDocumentReverted}
        />
      )}
    </div>
  );
};

export default MarkdownRenderer;
