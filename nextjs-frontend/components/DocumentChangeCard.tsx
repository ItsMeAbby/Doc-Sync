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
import type { DocumentEdit, GeneratedDocument, ContentChange, OriginalContent } from "@/lib/edit-types";

interface DocumentChangeCardProps {
  change: DocumentEdit | GeneratedDocument;
  type: "edit" | "create";
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<"inline" | "split">("inline");

  const isEdit = type === "edit";
  const editChange = change as DocumentEdit;
  const createChange = change as GeneratedDocument;

  const getTitle = () => {
    if (isEdit) {
      return `Edit: ${originalContent?.title || originalContent?.name || editChange.document_id}`;
    }
    return `Create: ${createChange.title}`;
  };

  const getPath = () => {
    if (isEdit) {
      return originalContent?.path || editChange.document_id;
    }
    return createChange.path;
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

  return (
    <Card className={cn("transition-all", disabled && "opacity-50")}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              disabled={disabled}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {isEdit ? (
                  <FileEdit className="h-4 w-4 text-blue-500" />
                ) : (
                  <FilePlus className="h-4 w-4 text-green-500" />
                )}
                <CardTitle className="text-base font-medium">
                  {getTitle()}
                </CardTitle>
                <Badge variant={isEdit ? "secondary" : "default"}>
                  {isEdit ? "Edit" : "Create"}
                </Badge>
                <Badge variant="outline">
                  {getChangeCount()} {getChangeCount() === 1 ? "change" : "changes"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Folder className="h-3 w-3" />
                <span className="font-mono">{getPath()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
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
            <div className="flex items-center justify-between">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="inline" className="gap-2">
                    <Code className="h-4 w-4" />
                    Inline
                  </TabsTrigger>
                  <TabsTrigger value="split" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Split
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="border rounded-lg overflow-hidden">
              {isEdit ? (
                <div className="max-h-96 overflow-y-auto">
                  <DiffViewer
                    oldContent={originalContent?.markdown_content || ''}
                    newContent={applyChangesToContent(originalContent?.markdown_content || '', editChange.changes)}
                    viewMode={viewMode}
                    className="p-4"
                  />
                </div>
              ) : (
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="ja">Japanese</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en" className="m-0">
                    <div className="max-h-96 overflow-y-auto">
                      <DiffViewer
                        oldContent=""
                        newContent={createChange.markdown_content_en}
                        viewMode={viewMode}
                        className="p-4"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="ja" className="m-0">
                    <div className="max-h-96 overflow-y-auto">
                      <DiffViewer
                        oldContent=""
                        newContent={createChange.markdown_content_ja}
                        viewMode={viewMode}
                        className="p-4"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {isEdit && editChange.changes.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Individual Changes:</h4>
                <div className="space-y-2">
                  {editChange.changes.map((change: ContentChange, index: number) => (
                    <div key={index} className="border rounded p-3 space-y-2">
                      <Badge variant="outline" className="text-xs">
                        Change {index + 1}
                      </Badge>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-red-600 dark:text-red-400">- </span>
                          <span className="font-mono bg-red-50 dark:bg-red-900/20 px-1 rounded">
                            {change.old_string}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-600 dark:text-green-400">+ </span>
                          <span className="font-mono bg-green-50 dark:bg-green-900/20 px-1 rounded">
                            {change.new_string}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}