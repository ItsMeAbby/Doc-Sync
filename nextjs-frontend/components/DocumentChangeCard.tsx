"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  FileEdit, 
  FilePlus, 
  FileX,
  Check, 
  X, 
  ChevronDown,
  ChevronRight,
  Code,
  Eye,
  FileText,
  Folder
} from "lucide-react";
import { DiffViewer } from "./DiffViewer";
import type { DocumentEdit, GeneratedDocument, DocumentToDelete, ContentChange, OriginalContent } from "@/lib/edit-types";

interface DocumentChangeCardProps {
  change: DocumentEdit | GeneratedDocument | DocumentToDelete;
  type: "edit" | "create" | "delete";
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onApply: () => void;
  onIgnore: () => void;
  originalContent: OriginalContent;
  disabled?: boolean;
}

export function DocumentChangeCard({
  change,
  type,
  isSelected,
  onSelectionChange,
  onApply,
  onIgnore,
  originalContent,
  disabled = false,
}: DocumentChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"inline" | "split">("split");
  const [showIndividualChanges, setShowIndividualChanges] = useState(false);
  const [individualChangesExpanded, setIndividualChangesExpanded] = useState<{[key: number]: boolean}>({});

  const isEdit = type === "edit";
  const isCreate = type === "create";
  const isDelete = type === "delete";
  const editChange = change as DocumentEdit;
  const createChange = change as GeneratedDocument;
  const deleteChange = change as DocumentToDelete;

  const getTitle = () => {
    if (isEdit) {
      return `Edit: ${originalContent?.title || originalContent?.name || editChange.document_id}`;
    }
    if (isCreate) {
      return `Create: ${createChange.title}`;
    }
    return `Delete: ${deleteChange.title}`;
  };

  const getPath = () => {
    if (isEdit) {
      return originalContent?.path || editChange.document_id;
    }
    if (isCreate) {
      return createChange.path;
    }
    return deleteChange.path;
  };

  const getChangeCount = () => {
    if (isEdit) {
      return editChange.changes.length;
    }
    return 1;
  };

  const applyChangesToContent = (content: string, changes: ContentChange[]) => {
    
    // Handle undefined or empty content
    if (!content) {
      return '';
    }
    
    let modifiedContent = content;
    
    // Apply changes in reverse order to avoid index shifting
    const sortedChanges = [...changes].sort((a, b) => {
      const indexA = content.lastIndexOf(a.old_string);
      const indexB = content.lastIndexOf(b.old_string);
      return indexB - indexA;
    });

    sortedChanges.forEach((change) => {
      modifiedContent = modifiedContent.replace(change.old_string, change.new_string);
    });

    return modifiedContent;
  };

  const toggleIndividualChange = (index: number) => {
    setIndividualChangesExpanded(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <Card className={cn("transition-all", disabled && "opacity-50")}>
      <CardHeader className="space-y-3">
        {/* Mobile and tablet layout: Stack vertically for smaller screens */}
        <div className="block lg:hidden space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              disabled={disabled}
              className="mt-1 flex-shrink-0"
            />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto flex-shrink-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {isEdit ? (
                  <FileEdit className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : isCreate ? (
                  <FilePlus className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <FileX className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium break-words leading-tight">
                    {getTitle()}
                  </CardTitle>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 ml-10">
                <Badge variant={isEdit ? "secondary" : isCreate ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
                  {isEdit ? "Edit" : isCreate ? "Create" : "Delete"}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {getChangeCount()} {getChangeCount() === 1 ? "change" : "changes"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-10">
                <Folder className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono break-all text-xs">{getPath()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pl-11">
            <Button
              size="sm"
              variant="default"
              onClick={onApply}
              disabled={disabled}
              className="gap-1 flex-1 text-xs h-8"
            >
              <Check className="h-3 w-3" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onIgnore}
              disabled={disabled}
              className="gap-1 flex-1 text-xs h-8"
            >
              <X className="h-3 w-3" />
              Ignore
            </Button>
          </div>
        </div>

        {/* Desktop layout: Single row for large screens */}
        <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              disabled={disabled}
              className="mt-1 flex-shrink-0"
            />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto flex-shrink-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {isEdit ? (
                  <FileEdit className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : isCreate ? (
                  <FilePlus className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <FileX className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <CardTitle className="text-base font-medium break-words flex-1 min-w-0">
                  {getTitle()}
                </CardTitle>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge variant={isEdit ? "secondary" : isCreate ? "default" : "destructive"}>
                    {isEdit ? "Edit" : isCreate ? "Create" : "Delete"}
                  </Badge>
                  <Badge variant="outline">
                    {getChangeCount()} {getChangeCount() === 1 ? "change" : "changes"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Folder className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono break-all">{getPath()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="default"
              onClick={onApply}
              disabled={disabled}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onIgnore}
              disabled={disabled}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Ignore
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              {isEdit ? (
                <DiffViewer
                  oldContent={originalContent?.markdown_content || ''}
                  newContent={applyChangesToContent(originalContent?.markdown_content || '', editChange.changes)}
                  viewMode={viewMode}
                  className="p-4"
                />
              ) : isCreate ? (
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="ja">Japanese</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en" className="m-0">
                    <DiffViewer
                      oldContent=""
                      newContent={createChange.markdown_content_en}
                      viewMode={viewMode}
                      className="p-4"
                    />
                  </TabsContent>
                  <TabsContent value="ja" className="m-0">
                    <DiffViewer
                      oldContent=""
                      newContent={createChange.markdown_content_ja}
                      viewMode={viewMode}
                      className="p-4"
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <FileX className="h-5 w-5 text-red-500" />
                    <h4 className="text-lg font-medium text-red-700 dark:text-red-400">
                      Document to be deleted
                    </h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><strong>Document ID:</strong> {deleteChange.document_id}</div>
                    <div><strong>Title:</strong> {deleteChange.title}</div>
                    <div><strong>Path:</strong> {deleteChange.path}</div>
                    <div><strong>Version:</strong> {deleteChange.version}</div>
                  </div>
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                      ⚠️ Warning: This document will be permanently deleted and cannot be recovered.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isEdit && editChange.changes.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Individual Changes:</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIndividualChanges(!showIndividualChanges)}
                    className="text-xs gap-1"
                  >
                    {showIndividualChanges ? (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        Show Details ({editChange.changes.length})
                      </>
                    )}
                  </Button>
                </div>
                
                {showIndividualChanges && (
                  <div className="space-y-3">
                    {editChange.changes.map((change: ContentChange, index: number) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Change {index + 1}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleIndividualChange(index)}
                            className="p-1 h-auto"
                          >
                            {individualChangesExpanded[index] ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {individualChangesExpanded[index] && (
                          <div className="p-3">
                            <DiffViewer
                              oldContent={change.old_string}
                              newContent={change.new_string}
                              viewMode="split"
                              enableMarkdown={true}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}