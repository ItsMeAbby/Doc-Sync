"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle,
  FileEdit,
  FilePlus,
  CheckCircle2,
  Loader2
} from "lucide-react";
import type { DocumentEdit, GeneratedDocument } from "@/lib/edit-types";

interface ApplyChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: (DocumentEdit | GeneratedDocument)[];
  changeType: "edit" | "create" | "mixed";
  isLoading?: boolean;
}

export function ApplyChangesModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  changeType,
  isLoading = false,
}: ApplyChangesModalProps) {
  const editCount = changes.filter((c) => "changes" in c).length;
  const createCount = changes.filter((c) => "markdown_content_en" in c).length;

  const getTitle = () => {
    if (changeType === "edit") {
      return `Apply ${editCount} Edit${editCount !== 1 ? "s" : ""}`;
    } else if (changeType === "create") {
      return `Create ${createCount} New Document${createCount !== 1 ? "s" : ""}`;
    }
    return `Apply ${changes.length} Change${changes.length !== 1 ? "s" : ""}`;
  };

  const getDescription = () => {
    if (changeType === "edit") {
      return "The following documents will be updated with the suggested changes:";
    } else if (changeType === "create") {
      return "The following new documents will be created:";
    }
    return "The following changes will be applied to your documentation:";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {changeType === "mixed" && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <FileEdit className="h-3 w-3" />
                {editCount} Edit{editCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="default" className="gap-1">
                <FilePlus className="h-3 w-3" />
                {createCount} New File{createCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            {changes.map((change, index) => {
              const isEdit = "changes" in change;
              const editChange = change as DocumentEdit;
              const createChange = change as GeneratedDocument;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  {isEdit ? (
                    <FileEdit className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FilePlus className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {isEdit ? editChange.document_id : createChange.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isEdit
                        ? `${editChange.changes.length} change${
                            editChange.changes.length !== 1 ? "s" : ""
                          }`
                        : createChange.path}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will modify your documentation. Make sure you have reviewed
              all changes before proceeding. These changes cannot be undone automatically.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm & Apply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}