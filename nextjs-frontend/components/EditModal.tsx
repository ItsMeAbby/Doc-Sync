"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as Popover from "@radix-ui/react-popover";
import { Save, X, Check, X as XIcon, Loader2 } from "lucide-react";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (content: string) => void;
  documentId?: string;
  onDocumentUpdated?: () => void;
}

interface SelectionData {
  selectedText: string;
  show: boolean;
  selectionStart: number;
  selectionEnd: number;
}

interface InlineEditResponse {
  query: string;
  original_text: string;
  edited_text: string;
  message: string;
}

export default function EditModal({ isOpen, onClose, content, onSave, documentId, onDocumentUpdated }: EditModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [selection, setSelection] = useState<SelectionData>({
    selectedText: "",
    show: false,
    selectionStart: 0,
    selectionEnd: 0,
  });
  const [query, setQuery] = useState("");
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inlineEditResponse, setInlineEditResponse] = useState<InlineEditResponse | null>(null);
  const [isLoadingInlineEdit, setIsLoadingInlineEdit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasUnsavedChanges = editedContent !== content;

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (isOpen) {
      // Reset all states when modal opens
      setEditedContent(content);
      setSelection({ selectedText: "", show: false, selectionStart: 0, selectionEnd: 0 });
      setQuery("");
      setShowSaveConfirmation(false);
      setShowUnsavedWarning(false);
      setIsSaving(false);
      setInlineEditResponse(null);
      setIsLoadingInlineEdit(false);
    }
  }, [isOpen, content]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);


  const handleTextSelection = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const selectedText = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );

    if (selectedText.trim().length > 0) {
      setSelection({
        selectedText: selectedText.trim(),
        show: true,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      });
      // Reset previous inline edit response
      setInlineEditResponse(null);
    } else {
      setSelection(prev => ({ ...prev, show: false }));
      setInlineEditResponse(null);
    }
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selection.selectedText) return;

    try {
      setIsLoadingInlineEdit(true);
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/api/edit/inline_edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selected_text: selection.selectedText,
          query: query.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get inline edit suggestion: ${response.statusText}`);
      }

      const result: InlineEditResponse = await response.json();
      setInlineEditResponse(result);
      
    } catch (error) {
      console.error("Error getting inline edit suggestion:", error);
      // TODO: Show error toast
    } finally {
      setIsLoadingInlineEdit(false);
    }
  };

  const handleAcceptEdit = () => {
    if (!inlineEditResponse || !textareaRef.current) return;

    // Replace the selected text with the edited text
    const newContent = 
      editedContent.substring(0, selection.selectionStart) +
      inlineEditResponse.edited_text +
      editedContent.substring(selection.selectionEnd);
    
    setEditedContent(newContent);
    
    // Reset states
    setSelection(prev => ({ ...prev, show: false }));
    setInlineEditResponse(null);
    setQuery("");
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleRejectEdit = () => {
    setInlineEditResponse(null);
    setQuery("");
  };

  const handleSave = () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }
    setShowSaveConfirmation(true);
  };

  const handleConfirmSave = async () => {
    if (!documentId) {
      console.error("No document ID provided");
      return;
    }

    try {
      setIsSaving(true);
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markdown_content: editedContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const newVersion = await response.json();
      console.log("New version created:", newVersion);
      
      onSave(editedContent);
      setShowSaveConfirmation(false);
      
      // Invalidate cache and refresh parent component
      onDocumentUpdated?.();
      
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    // Reset all states when forcefully closing
    setEditedContent(content); // Reset to original content
    setSelection({ selectedText: "", show: false, selectionStart: 0, selectionEnd: 0 });
    setQuery("");
    setShowSaveConfirmation(false);
    setShowUnsavedWarning(false);
    setIsSaving(false);
    setInlineEditResponse(null);
    setIsLoadingInlineEdit(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-6xl w-[95vw] h-[90vh] flex flex-col [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleClose();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Edit Document
                {hasUnsavedChanges && (
                  <span className="text-sm text-orange-600 dark:text-orange-400">
                    (Unsaved changes)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} size="sm" disabled={!hasUnsavedChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Save (Ctrl+S)
                </Button>
                <Button 
                  onClick={handleClose} 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Fixed position popup below header */}
          {selection.show && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <div className="space-y-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Selected: </span>
                  <span className="italic">
                    "{selection.selectedText.length > 60 
                      ? selection.selectedText.substring(0, 60) + "..." 
                      : selection.selectedText}"
                  </span>
                </div>
                
                {!inlineEditResponse ? (
                  <form onSubmit={handleQuerySubmit} className="space-y-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What would you like to do with this text?"
                      className="w-full text-sm"
                      autoFocus
                      disabled={isLoadingInlineEdit}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="text-xs h-8 px-3"
                        onClick={() => setSelection(prev => ({ ...prev, show: false }))}
                        disabled={isLoadingInlineEdit}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="text-xs h-8 px-3"
                        disabled={!query.trim() || isLoadingInlineEdit}
                      >
                        {isLoadingInlineEdit ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Submit'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                      <div className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">
                        Suggested edit:
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        "{inlineEditResponse.edited_text}"
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 italic">
                        {inlineEditResponse.message}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-8 px-3 text-red-600 hover:text-red-700"
                        onClick={handleRejectEdit}
                      >
                        <XIcon className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        className="text-xs h-8 px-3 bg-green-600 hover:bg-green-700"
                        onClick={handleAcceptEdit}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 border rounded-md resize-none font-mono text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              placeholder="Edit your document content here..."
              spellCheck={false}
            />
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Select any text and enter a query to analyze it. Use Ctrl+S to save.
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes? This will create a new version of the document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSaveConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you close this editor. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedWarning(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForceClose}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}