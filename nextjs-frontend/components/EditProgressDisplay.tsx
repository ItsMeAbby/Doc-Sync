"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Plus,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import {
  EditProgressEvent,
  EditProgressEventType,
} from "@/hooks/useEditDocumentationWebSocket";

interface EditProgressDisplayProps {
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  events: EditProgressEvent[];
  error: string | null;
  onCancel?: () => void;
  onViewResults?: () => void;
  showResults?: boolean;
}

const getEventIcon = (type: EditProgressEventType) => {
  switch (type) {
    case "intent_detected":
    case "suggestions_found":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "document_processing":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "document_completed":
      return <FileText className="h-4 w-4 text-green-500" />;
    case "document_created":
      return <Plus className="h-4 w-4 text-blue-500" />;
    case "document_deleted":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "finished":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "progress":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getEventTitle = (event: EditProgressEvent): string => {
  switch (event.type) {
    case "intent_detected":
      return "Intent Detected";
    case "suggestions_found":
      return `Found ${event.payload.suggestions?.length || 0} Suggestions`;
    case "document_processing":
      return `Processing Document`;
    case "document_completed":
      return "Document Completed";
    case "document_created":
      return "Document Created";
    case "document_deleted":
      return "Document Deleted";
    case "error":
      return "Error Occurred";
    case "finished":
      return "Processing Complete";
    case "progress":
      return event.payload.message || "Progress Update";
    default:
      return "Unknown Event";
  }
};

const getEventDescription = (event: EditProgressEvent): string => {
  switch (event.type) {
    case "intent_detected":
      const intents = event.payload.intents || [];
      return `Detected ${intents.length} intent(s): ${intents.map((i: any) => i.intent).join(", ")}`;
    case "suggestions_found":
      return `Found suggestions for editing documentation`;
    case "document_processing":
      const { suggestion_index, total_suggestions, document_title, document_path } = event.payload;
      const titleDisplay = document_title && document_title !== "Unknown" ? document_title : document_path;
      return `Processing suggestion ${suggestion_index}/${total_suggestions}${titleDisplay ? ` for "${titleDisplay}"` : ""}`;
    case "document_completed":
      return `Applied ${event.payload.changes?.length || 1} change(s)`;
    case "document_created":
      return `Created "${event.payload.title || event.payload.name}"`;
    case "document_deleted":
      return `Deleted "${event.payload.title}"`;
    case "error":
      return event.payload.message || "An error occurred";
    case "finished":
      return event.payload.message || "All operations completed successfully";
    case "progress":
      return `Step ${event.payload.step || 0}/${event.payload.total_steps || 4}`;
    default:
      return JSON.stringify(event.payload);
  }
};

const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const percentage = Math.min((current / total) * 100, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export function EditProgressDisplay({
  isProcessing,
  currentStep,
  totalSteps,
  events,
  error,
  onCancel,
  onViewResults,
  showResults = false,
}: EditProgressDisplayProps) {
  const isComplete = !isProcessing && events.some(e => e.type === "finished");
  const hasResults = events.some(e => ["document_completed", "document_created", "document_deleted"].includes(e.type));

  // Count results
  const resultsCount = {
    edits: events.filter(e => e.type === "document_completed").length,
    creates: events.filter(e => e.type === "document_created").length,
    deletes: events.filter(e => e.type === "document_deleted").length,
  };

  return (
    <Card className="p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {isProcessing ? "Processing Documentation Changes" : isComplete ? "Processing Complete" : "Documentation Analysis"}
        </h3>
        {isProcessing && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {(isProcessing || isComplete) && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span>{currentStep}/{totalSteps} steps</span>
          </div>
          <ProgressBar current={currentStep} total={totalSteps} />
        </div>
      )}

      {/* Current Status */}
      {isProcessing && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <Spinner size="sm" />
          <span className="text-sm text-blue-600 dark:text-blue-400">
            {events.length > 0 ? getEventDescription(events[events.length - 1]) : "Starting analysis..."}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Summary */}
      {isComplete && hasResults && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Analysis Complete
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Found {resultsCount.edits} edits, {resultsCount.creates} creates, {resultsCount.deletes} deletes
              </p>
            </div>
            {onViewResults && !showResults && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewResults}
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                View Results
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Processing Log
          </h4>
          <ScrollArea className="h-[36rem]  border rounded-md p-3">
            <div className="space-y-2">
              {events.map((event, index) => (
                <div
                  key={`${event.event_id}-${index}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {getEventTitle(event)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      {getEventDescription(event)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* No Results Message */}
      {isComplete && !hasResults && !error && (
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No changes were identified for your request.</p>
          <p className="text-sm">Try refining your query or checking if the documentation is already up to date.</p>
        </div>
      )}
    </Card>
  );
}