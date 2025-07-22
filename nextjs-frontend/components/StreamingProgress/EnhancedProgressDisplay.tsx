"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertCircle,
  X,
  Eye,
  Brain,
  CheckCircle2,
  Activity,
  Filter,
  ChevronDown
} from "lucide-react";
import { EditProgressEvent } from "@/hooks/useEditDocumentationWebSocket";
import { IntentGroupCard, IntentType } from "./IntentGroupCard";

interface EnhancedProgressDisplayProps {
  isProcessing: boolean;
  events: EditProgressEvent[];
  error: string | null;
  onCancel?: () => void;
  onViewResults?: () => void;
  showResults?: boolean;
}

export function EnhancedProgressDisplay({
  isProcessing,
  events,
  error,
  onCancel,
  onViewResults,
  showResults = false,
}: EnhancedProgressDisplayProps) {
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  
  // Organize events by intent type and phase
  const { intentGroups, currentPhase, overallProgress } = useMemo(() => {
    const intentDetected = events.find(e => e.type === "intent_detected");
    const isComplete = events.some(e => e.type === "finished");
    
    // Get detected intents
    const detectedIntents: IntentType[] = intentDetected?.payload.intents?.map((i: any) => i.intent) || [];
    
    // Group events by intent type
    const editEvents = events.filter(e => 
      ["suggestions_found", "document_processing", "document_completed", "error"].includes(e.type)
    );
    const createEvents = events.filter(e => e.type === "document_created");
    const deleteEvents = events.filter(e => e.type === "document_deleted");
    const errorEvents = events.filter(e => e.type === "error");
    
    // Calculate progress for each intent
    const getIntentProgress = (intentType: IntentType) => {
      switch (intentType) {
        case "edit":
          const suggestionsFound = editEvents.find(e => e.type === "suggestions_found");
          const totalSuggestions = suggestionsFound?.payload.suggestions?.length || 0;
          const completedSuggestions = editEvents.filter(e => e.type === "document_completed").length;
          const processedSuggestions = editEvents.filter(e => e.type === "document_processing").length;
          
          // If we're complete (finished event exists) or no more processing events coming,
          // consider all suggestions as "attempted" (processed = completed + errors)
          const processed = isComplete ? totalSuggestions : Math.max(completedSuggestions, processedSuggestions);
          
          return { 
            total: totalSuggestions, 
            completed: completedSuggestions,
            processed: processed,
            errors: Math.max(0, processed - completedSuggestions)
          };
        case "create":
          return { 
            total: createEvents.length, 
            completed: createEvents.length,
            processed: createEvents.length,
            errors: 0
          };
        case "delete":
          return { 
            total: deleteEvents.length, 
            completed: deleteEvents.length,
            processed: deleteEvents.length,
            errors: 0
          };
        default:
          return { total: 0, completed: 0, processed: 0, errors: 0 };
      }
    };

    // Determine current phase
    let phase = "analyzing";
    if (isComplete) {
      phase = "complete";
    } else if (events.some(e => ["document_processing", "document_completed", "document_created", "document_deleted"].includes(e.type))) {
      phase = "processing";
    } else if (intentDetected) {
      phase = "planning";
    }

    // Calculate overall progress
    const totalOperations = detectedIntents.reduce((sum, intent) => {
      return sum + getIntentProgress(intent).total;
    }, 0);
    
    const processedOperations = detectedIntents.reduce((sum, intent) => {
      return sum + getIntentProgress(intent).processed;
    }, 0);
    
    const completedOperations = detectedIntents.reduce((sum, intent) => {
      return sum + getIntentProgress(intent).completed;
    }, 0);
    
    const errorOperations = detectedIntents.reduce((sum, intent) => {
      return sum + getIntentProgress(intent).errors;
    }, 0);

    const progressPercentage = totalOperations > 0 ? (processedOperations / totalOperations) * 100 : 0;

    return {
      intentGroups: detectedIntents.map(intent => ({
        type: intent,
        events: intent === "edit" ? editEvents : intent === "create" ? createEvents : deleteEvents,
        progress: getIntentProgress(intent),
        isActive: isProcessing && (
          (intent === "edit" && editEvents.some(e => e.type === "document_processing")) ||
          (intent === "create" && events.some(e => e.type === "progress" && e.payload.message?.includes("Creating"))) ||
          (intent === "delete" && events.some(e => e.type === "progress" && e.payload.message?.includes("delete")))
        ),
        isComplete: getIntentProgress(intent).total > 0 && getIntentProgress(intent).processed === getIntentProgress(intent).total
      })),
      currentPhase: phase,
      overallProgress: {
        percentage: Math.round(progressPercentage),
        completed: completedOperations,
        processed: processedOperations,
        errors: errorOperations,
        total: totalOperations
      }
    };
  }, [events, isProcessing]);

  const getPhaseDisplay = () => {
    switch (currentPhase) {
      case "analyzing":
        return {
          icon: <Brain className="h-5 w-5 text-blue-500" />,
          title: "Analyzing Request",
          description: "Understanding your documentation update requirements"
        };
      case "planning":
        return {
          icon: <Activity className="h-5 w-5 text-purple-500" />,
          title: "Planning Operations",
          description: "Identifying documents and changes needed"
        };
      case "processing":
        return {
          icon: <Spinner size="sm" className="text-blue-500" />,
          title: "Processing Documentation",
          description: "Generating suggestions and analyzing content"
        };
      case "complete":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          title: "Analysis Complete",
          description: "Ready to review suggestions and apply changes"
        };
      default:
        return {
          icon: <Activity className="h-5 w-5 text-gray-500" />,
          title: "Preparing",
          description: "Getting ready to process your request"
        };
    }
  };

  const phaseDisplay = getPhaseDisplay();
  const hasResults = intentGroups.some(group => group.progress.total > 0);

  return (
    <Card className="p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {phaseDisplay.icon}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {phaseDisplay.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {phaseDisplay.description}
            </p>
          </div>
        </div>
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

      {/* Overall Progress */}
      {overallProgress.total > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Analysis Progress
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {currentPhase === "complete" 
                  ? overallProgress.errors > 0
                    ? `${overallProgress.completed} suggestions ready for review, ${overallProgress.errors} had errors`
                    : "All suggestions ready for review"
                  : "Processing your documentation updates"
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {overallProgress.processed}/{overallProgress.total} processed
                {overallProgress.errors > 0 && (
                  <span className="text-red-500 ml-1">({overallProgress.errors} errors)</span>
                )}
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  overallProgress.percentage === 100 
                    ? overallProgress.errors > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-700' 
                      : 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                {overallProgress.percentage}%
              </Badge>
            </div>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-in-out ${
                overallProgress.percentage === 100
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
              }`}
              style={{ width: `${overallProgress.percentage}%` }}
            />
            {isProcessing && overallProgress.percentage < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Intent Groups */}
      {intentGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Analysis Operations
            </h4>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletedOnly(!showCompletedOnly)}
                className={`text-xs h-7 ${showCompletedOnly ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <Filter className="h-3 w-3 mr-1" />
                {showCompletedOnly ? 'Show All' : 'Completed Only'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(!expandAll)}
                className="text-xs h-7"
              >
                <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${expandAll ? 'rotate-180' : ''}`} />
                {expandAll ? 'Collapse All' : 'Expand All'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            {intentGroups
              .filter(group => !showCompletedOnly || group.isComplete)
              .map((group) => (
                <IntentGroupCard
                  key={group.type}
                  intentType={group.type}
                  events={group.events}
                  isActive={group.isActive}
                  isComplete={group.isComplete}
                  documentCount={group.progress.total}
                  completedCount={group.progress.completed}
                  errorCount={group.progress.errors}
                  forceExpanded={expandAll}
                />
              ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {currentPhase === "complete" && hasResults && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Analysis Complete
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {overallProgress.total} suggestions ready for review and application
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
                Review Suggestions
              </Button>
            )}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {currentPhase === "complete" && !hasResults && !error && (
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No changes were identified for your request.</p>
          <p className="text-sm">Try refining your query or checking if the documentation is already up to date.</p>
        </div>
      )}
    </Card>
  );
}