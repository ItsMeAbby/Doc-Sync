"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  Hash,
  FileText,
  Clock,
  Eye,
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { DocumentNode, DocumentVersion } from "@/app/documentation/types";
import { documentVersionsApi } from "@/app/api/documentVersions";

interface VersionHistoryModalProps {
  document: DocumentNode;
  isOpen: boolean;
  onClose: () => void;
  onRevert?: () => void; // Callback to refresh parent component
}

export default function VersionHistoryModal({
  document,
  isOpen,
  onClose,
  onRevert,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<boolean>(false);

  // Selected version details
  const selectedVersion = versions.find((v) => v.version === selectedVersionId);

  useEffect(() => {
    if (isOpen && document.id) {
      fetchVersions();
    }
  }, [isOpen, document.id]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedVersions = await documentVersionsApi.getDocumentVersions(
        document.id,
      );
      setVersions(fetchedVersions);

      // Select the latest version by default
      if (fetchedVersions.length > 0) {
        const latestVersion =
          fetchedVersions.find((v) => v.latest) || fetchedVersions[0];
        setSelectedVersionId(latestVersion.version);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch versions";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleClose = () => {
    setVersions([]);
    setSelectedVersionId("");
    setError(null);
    setReverting(false);
    onClose();
  };

  const handleRevert = async (versionId: string) => {
    try {
      setReverting(true);
      setError(null);

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
            current_version_id: versionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to revert document: ${response.statusText}`);
      }

      // Call the onRevert callback to refresh the parent component
      onRevert?.();

      // Close the modal
      handleClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to revert document";
      setError(errorMessage);
    } finally {
      setReverting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] lg:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Document Version History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Metadata */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Title:</span>
              <span>{document.title || document.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Document ID:</span>
              <span className="font-mono text-sm">{document.id}</span>
            </div>
            {document.path && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Path:</span>
                <span className="font-mono text-sm">{document.path}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">Type:</span>
              <Badge variant={document.is_api_ref ? "default" : "secondary"}>
                {document.is_api_ref ? "API Reference" : "Documentation"}
              </Badge>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-3 min-h-[400px]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {/* Version Selection */}
          {!loading && !error && versions.length > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label
                    htmlFor="version-select"
                    className="text-sm font-medium"
                  >
                    Select Version ({versions.length} total)
                  </label>
                  {selectedVersion && !selectedVersion.latest && (
                    <Button
                      onClick={() => handleRevert(selectedVersionId)}
                      disabled={reverting}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {reverting ? "Reverting..." : "Revert to this version"}
                    </Button>
                  )}
                </div>
                <Select
                  value={selectedVersionId}
                  onValueChange={setSelectedVersionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version, index) => (
                      <SelectItem key={version.version} value={version.version}>
                        <div className="flex items-center gap-2">
                          <span>
                            {version.latest
                              ? "Latest (Current)"
                              : `Version ${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(version.created_at)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Version Content Tabs */}
              {selectedVersion && (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="details"
                      className="flex items-center gap-2"
                    >
                      <Hash className="h-4 w-4" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="content"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md space-y-3">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                        Version Details
                      </h3>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium">Created:</span>
                          <span>{formatDate(selectedVersion.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium">Version ID:</span>
                          <span className="font-mono text-xs">
                            {selectedVersion.version}
                          </span>
                        </div>

                        {selectedVersion.language && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Language:</span>
                            <Badge variant="outline">
                              {selectedVersion.language}
                            </Badge>
                          </div>
                        )}

                        {selectedVersion.keywords_array &&
                          selectedVersion.keywords_array.length > 0 && (
                            <div>
                              <span className="font-medium block mb-1">
                                Keywords:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {selectedVersion.keywords_array.map(
                                  (keyword, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {keyword}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                        {selectedVersion.summary && (
                          <div>
                            <span className="font-medium block mb-1">
                              Summary:
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded text-xs">
                              {selectedVersion.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="mt-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                      <ScrollArea className="h-96 p-4 overflow-auto">
                        <div className="overflow-x-auto">
                          <ReactMarkdown
                            className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400"
                            rehypePlugins={[rehypeHighlight, rehypeRaw]}
                            remarkPlugins={[remarkGfm]}
                          >
                            {selectedVersion.markdown_content ||
                              "No content available"}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          ) : !loading && !error && versions.length === 0 ? (
            /* No Versions State */
            <div className="text-center py-8 text-gray-500 min-h-[400px] flex flex-col items-center justify-center">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No version history available for this document.</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
