"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  FileEdit, 
  FileText, 
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { EditProgressEvent } from "@/hooks/useEditDocumentationWebSocket";

export type IntentType = "edit" | "create" | "delete";

interface IntentGroupCardProps {
  intentType: IntentType;
  events: EditProgressEvent[];
  isActive: boolean;
  isComplete: boolean;
  documentCount: number;
  completedCount: number;
  errorCount?: number;
  forceExpanded?: boolean;
}

const intentConfig = {
  edit: {
    icon: FileEdit,
    title: "Edit Suggestions",
    description: "Analyzing content for potential improvements",
    completedDescription: "Edit suggestions ready for review",
    color: "blue",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300"
  },
  create: {
    icon: FileText,
    title: "Content Creation Ideas",
    description: "Generating new documentation concepts",
    completedDescription: "Creation suggestions ready for review", 
    color: "green",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-300"
  },
  delete: {
    icon: Search,
    title: "Removal Suggestions",
    description: "Reviewing content for potential removal",
    completedDescription: "Removal suggestions ready for review",
    color: "amber",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    textColor: "text-amber-700 dark:text-amber-300"
  }
};

export function IntentGroupCard({
  intentType,
  events,
  isActive,
  isComplete,
  documentCount,
  completedCount,
  errorCount = 0,
  forceExpanded
}: IntentGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const config = intentConfig[intentType];
  const IconComponent = config.icon;

  // Handle expansion logic
  React.useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    } else if (isActive) {
      setIsExpanded(true);
    } else if (isComplete && !isActive) {
      // Auto-collapse after a delay when complete
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, isComplete, forceExpanded]);

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isActive) {
      return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isComplete) {
      if (errorCount > 0) {
        return `${config.completedDescription} (${errorCount} with errors)`;
      }
      return config.completedDescription;
    }
    if (isActive) {
      return config.description;
    }
    return "Pending analysis";
  };

  const getProgressText = () => {
    if (documentCount === 0) return "";
    if (isComplete) {
      if (errorCount > 0) {
        return `${completedCount} completed, ${errorCount} errors`;
      }
      return `${documentCount} ${documentCount === 1 ? 'item' : 'items'}`;
    }
    if (isActive && completedCount > 0) {
      return `${completedCount}/${documentCount} completed`;
    }
    return `${documentCount} ${documentCount === 1 ? 'item' : 'items'} to process`;
  };

  // Filter events relevant to this intent
  const relevantEvents = events.filter(event => {
    switch (intentType) {
      case "edit":
        return ["suggestions_found", "document_processing", "document_completed"].includes(event.type);
      case "create":
        return ["document_created"].includes(event.type);
      case "delete":
        return ["document_deleted"].includes(event.type);
      default:
        return false;
    }
  });

  const hasEvents = relevantEvents.length > 0;

  return (
    <Card className={`transition-all duration-300 ${
      isActive 
        ? 'ring-2 ring-blue-200 shadow-md' 
        : isComplete 
        ? 'ring-1 ring-green-200' 
        : 'hover:shadow-sm'
    }`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild disabled={forceExpanded !== undefined}>
          <div className={`p-4 transition-colors duration-200 ${
            forceExpanded !== undefined 
              ? 'cursor-default' 
              : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {hasEvents ? (
                    <div className="transition-transform duration-200">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  ) : null}
                  <div className={`p-1.5 rounded-lg ${config.bgColor} transition-all duration-200`}>
                    <IconComponent className={`h-4 w-4 text-${config.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {config.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  {documentCount > 0 && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs transition-colors duration-200 ${
                        isComplete 
                          ? errorCount > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                          : ''
                      }`}
                    >
                      {getProgressText()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 ml-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getStatusText()}
              </p>
              {/* Progress bar for active operations */}
              {isActive && documentCount > 0 && completedCount > 0 && (
                <div className="mt-2 w-48">
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${(completedCount / documentCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {hasEvents && (
          <CollapsibleContent className="transition-all duration-300 ease-in-out">
            <div className="px-4 pb-4">
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="space-y-1">
                  {relevantEvents.map((event, index) => (
                    <EventItem 
                      key={`${event.event_id}-${index}`} 
                      event={event} 
                      intentType={intentType}
                      isLast={index === relevantEvents.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}

interface EventItemProps {
  event: EditProgressEvent;
  intentType: IntentType;
  isLast?: boolean;
}

function EventItem({ event, intentType, isLast = false }: EventItemProps) {
  const getEventIcon = () => {
    switch (event.type) {
      case "suggestions_found":
        return <Search className="h-4 w-4 text-blue-500" />;
      case "document_processing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "document_completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "document_created":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "document_deleted":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventTitle = () => {
    switch (event.type) {
      case "suggestions_found":
        return `Found ${event.payload.suggestions?.length || 0} Edit Suggestions`;
      case "document_processing":
        return "Analyzing Document";
      case "document_completed":
        return "Suggestions Generated";
      case "document_created":
        return "Creation Idea Generated";
      case "document_deleted":
        return "Removal Suggestion Found";
      default:
        return "Processing";
    }
  };

  const getEventDescription = () => {
    switch (event.type) {
      case "suggestions_found":
        return "Analysis complete - suggestions are ready for your review";
      case "document_processing":
        const { suggestion_index, total_suggestions, document_title, document_path } = event.payload;
        const titleDisplay = document_title && document_title !== "Unknown" ? document_title : document_path;
        return `Analyzing ${suggestion_index}/${total_suggestions}${titleDisplay ? ` for "${titleDisplay}"` : ""}`;
      case "document_completed":
        return `Generated ${event.payload.changes?.length || 1} improvement suggestion(s)`;
      case "document_created":
        return `"${event.payload.title || event.payload.name}" suggested for creation`;
      case "document_deleted":
        return `"${event.payload.title}" suggested for removal`;
      default:
        return event.payload.message || "Processing...";
    }
  };

  return (
    <div className={`relative flex items-start gap-3 py-2 pl-4 ${
      !isLast ? 'border-l-2 border-gray-200 dark:border-gray-700' : ''
    } transition-all duration-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md`}>
      {/* Timeline node */}
      <div className="flex-shrink-0 relative">
        <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"></div>
        <div className="mt-0.5 p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          {getEventIcon()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getEventTitle()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {getEventDescription()}
        </p>
      </div>
    </div>
  );
}