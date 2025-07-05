"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as Popover from "@radix-ui/react-popover";
import { Save, X } from "lucide-react";

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
  x: number;
  y: number;
}

export default function EditModal({ isOpen, onClose, content, onSave, documentId, onDocumentUpdated }: EditModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [selection, setSelection] = useState<SelectionData>({
    selectedText: "",
    show: false,
    x: 0,
    y: 0,
  });
  const [query, setQuery] = useState("");
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasUnsavedChanges = editedContent !== content;

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (isOpen) {
      // Reset all states when modal opens
      setEditedContent(content);
      setSelection({ selectedText: "", show: false, x: 0, y: 0 });
      setQuery("");
      setShowSaveConfirmation(false);
      setShowUnsavedWarning(false);
      setIsSaving(false);
    }
  }, [isOpen, content]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const getTextareaCaretPosition = (textarea: HTMLTextAreaElement, caretPos: number) => {
    // Create a dummy div to measure text position more accurately
    const div = document.createElement('div');
    const style = getComputedStyle(textarea);
    
    // Copy all relevant styles exactly
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.height = 'auto';
    div.style.width = textarea.clientWidth + 'px';
    div.style.fontSize = style.fontSize;
    div.style.fontFamily = style.fontFamily;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'hidden';
    
    // Split text into before and after caret
    const textBeforeCaret = textarea.value.substring(0, caretPos);
    const textAfterCaret = textarea.value.substring(caretPos);
    
    // Create spans for before and after caret
    const beforeSpan = document.createElement('span');
    beforeSpan.textContent = textBeforeCaret;
    
    const caretSpan = document.createElement('span');
    caretSpan.textContent = '|'; // Invisible marker
    caretSpan.style.visibility = 'visible';
    
    const afterSpan = document.createElement('span');
    afterSpan.textContent = textAfterCaret;
    
    div.appendChild(beforeSpan);
    div.appendChild(caretSpan);
    div.appendChild(afterSpan);
    
    document.body.appendChild(div);
    
    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();
    const caretRect = caretSpan.getBoundingClientRect();
    
    // Calculate position relative to textarea
    const x = textareaRect.left + (caretRect.left - div.getBoundingClientRect().left);
    const y = textareaRect.top + (caretRect.top - div.getBoundingClientRect().top);
    
    document.body.removeChild(div);
    
    return { x, y };
  };

  const handleTextSelection = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const selectedText = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );

    if (selectedText.trim().length > 0) {
      // Get position of selection start
      const { x, y } = getTextareaCaretPosition(textarea, textarea.selectionStart);
      
      setSelection({
        selectedText: selectedText.trim(),
        show: true,
        x,
        y,
      });
    } else {
      setSelection(prev => ({ ...prev, show: false }));
    }
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && selection.selectedText) {
      const payload = {
        selectedText: selection.selectedText,
        query: query.trim(),
        timestamp: new Date().toISOString(),
      };
      
      console.log("Query payload:", payload);
      
      // Reset selection and query
      setSelection(prev => ({ ...prev, show: false, x: 0, y: 0 }));
      setQuery("");
    }
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
    setSelection({ selectedText: "", show: false, x: 0, y: 0 });
    setQuery("");
    setShowSaveConfirmation(false);
    setShowUnsavedWarning(false);
    setIsSaving(false);
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
            
            {/* Floating popover positioned at selection */}
            {selection.show && (
              <div
                className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                           rounded-lg shadow-lg p-4 min-w-[350px]"
                style={{
                  left: `${selection.x}px`,
                  top: `${selection.y - 10}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                onMouseDown={(e) => {
                  // Prevent the popover from closing when clicking inside
                  e.stopPropagation();
                }}
              >
                  <div className="space-y-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Selected text:</span>
                      <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 max-h-20 overflow-y-auto">
                        "{selection.selectedText.length > 100 
                          ? selection.selectedText.substring(0, 100) + "..." 
                          : selection.selectedText}"
                      </div>
                    </div>
                    
                    <form onSubmit={handleQuerySubmit} className="space-y-3">
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your query about this text..."
                        className="w-full"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelection(prev => ({ ...prev, show: false, x: 0, y: 0 }))}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={!query.trim()}>
                          Submit Query
                        </Button>
                      </div>
                    </form>
                  </div>
                  
                  {/* Arrow pointing down to the selected text */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-300 dark:border-t-gray-600"></div>
                  </div>
                </div>
              )}
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