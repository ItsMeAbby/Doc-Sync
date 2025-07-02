"use client";

import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { diffChars, diffWords, diffLines } from "diff";
import { Button } from "@/components/ui/button";
import { Code, Eye } from "lucide-react";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  viewMode?: "inline" | "split";
  className?: string;
  enableMarkdown?: boolean;
}

export function DiffViewer({
  oldContent,
  newContent,
  viewMode = "inline",
  className,
  enableMarkdown = true,
}: DiffViewerProps) {
  const [renderMode, setRenderMode] = useState<"raw" | "markdown">("markdown");
  const differences = diffLines(oldContent, newContent, { ignoreWhitespace: false });

  const showMarkdownToggle = enableMarkdown && (oldContent.includes('#') || newContent.includes('#') || oldContent.includes('```') || newContent.includes('```'));

  if (viewMode === "split") {
    return (
      <div className={className}>
        {showMarkdownToggle && (
          <div className="flex justify-end mb-2">
            <div className="flex gap-1">
              <Button
                variant={renderMode === "raw" ? "default" : "outline"}
                size="sm"
                onClick={() => setRenderMode("raw")}
                className="gap-1"
              >
                <Code className="h-3 w-3" />
                Raw
              </Button>
              <Button
                variant={renderMode === "markdown" ? "default" : "outline"}
                size="sm"
                onClick={() => setRenderMode("markdown")}
                className="gap-1"
              >
                <Eye className="h-3 w-3" />
                Preview
              </Button>
            </div>
          </div>
        )}
        <SplitDiffView differences={differences} renderMode={renderMode} />
      </div>
    );
  }

  return (
    <div className={className}>
      {showMarkdownToggle && (
        <div className="flex justify-end mb-2">
          <div className="flex gap-1">
            <Button
              variant={renderMode === "raw" ? "default" : "outline"}
              size="sm"
              onClick={() => setRenderMode("raw")}
              className="gap-1"
            >
              <Code className="h-3 w-3" />
              Raw
            </Button>
            <Button
              variant={renderMode === "markdown" ? "default" : "outline"}
              size="sm"
              onClick={() => setRenderMode("markdown")}
              className="gap-1"
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
          </div>
        </div>
      )}
      <InlineDiffView differences={differences} renderMode={renderMode} />
    </div>
  );
}

function MarkdownContent({ content, className, changes }: { content: string; className?: string; changes?: any[] }) {
  // If we have changes, try to highlight the specific changed parts
  if (changes && changes.length > 0) {
    let highlightedContent = content;
    
    // Apply highlighting to changed sections
    changes.forEach((change, index) => {
      if (change.added) {
        // Wrap added content with highlighting spans
        const escapedOldString = change.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedContent = highlightedContent.replace(
          new RegExp(escapedOldString, 'g'),
          `<mark class="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100">${change.value}</mark>`
        );
      } else if (change.removed) {
        // For removed content, we'll show it with strikethrough in the original
        const escapedOldString = change.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedContent = highlightedContent.replace(
          new RegExp(escapedOldString, 'g'),
          `<mark class="bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-100 line-through">${change.value}</mark>`
        );
      }
    });
    
    return (
      <div className={className}>
        <ReactMarkdown
          className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm prose-pre:text-xs"
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          remarkPlugins={[remarkGfm]}
        >
          {highlightedContent}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm prose-pre:text-xs"
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function InlineDiffView({ differences, renderMode }: { differences: any; renderMode: string }) {
  if (renderMode === "markdown") {
    // Create a unified view showing changes inline
    let unifiedContent = '';
    const addedParts: string[] = [];
    const removedParts: string[] = [];
    
    differences.forEach((part: any) => {
      if (part.added) {
        addedParts.push(part.value);
        unifiedContent += `<mark class="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 px-1 rounded">${part.value}</mark>`;
      } else if (part.removed) {
        removedParts.push(part.value);
        unifiedContent += `<mark class="bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-100 line-through px-1 rounded">${part.value}</mark>`;
      } else {
        unifiedContent += part.value;
      }
    });

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Unified View (Changes Highlighted)
            </div>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-300 mb-3 flex gap-4">
            <span>🟢 Added content</span>
            <span>🔴 Removed content</span>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded border">
            <ReactMarkdown
              className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm prose-pre:text-xs"
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              remarkPlugins={[remarkGfm]}
            >
              {unifiedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Raw view - show line by line diff
  return (
    <div className="font-mono text-sm overflow-x-auto">
      <div className="min-w-0">
        {differences.map((part: any, index: number) => {
          const lines = part.value.split('\n').filter((line: string, i: number, arr: string[]) => 
            i < arr.length - 1 || line.length > 0
          );
          
          return lines.map((line: string, lineIndex: number) => {
            const key = `${index}-${lineIndex}`;
            
            if (part.added) {
              return (
                <div key={key} className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500">
                  <span className="text-green-600 dark:text-green-400 px-2">+</span>
                  <span className="text-green-700 dark:text-green-300">{line}</span>
                </div>
              );
            }
            
            if (part.removed) {
              return (
                <div key={key} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-red-600 dark:text-red-400 px-2">-</span>
                  <span className="text-red-700 dark:text-red-300">{line}</span>
                </div>
              );
            }
            
            return (
              <div key={key} className="bg-gray-50 dark:bg-gray-800 border-l-4 border-transparent">
                <span className="text-gray-400 px-2"> </span>
                <span className="text-gray-700 dark:text-gray-300">{line}</span>
              </div>
            );
          });
        }).flat()}
      </div>
    </div>
  );
}

function SplitDiffView({ differences, renderMode }: { differences: any; renderMode: string }) {
  if (renderMode === "markdown") {
    // For markdown view, show before and after side by side with highlighting
    const oldContent = differences
      .filter((part: any) => !part.added)
      .map((part: any) => part.value)
      .join('');
    
    const newContent = differences
      .filter((part: any) => !part.removed)
      .map((part: any) => part.value)
      .join('');

    // Create highlighted versions
    let highlightedOldContent = oldContent;
    let highlightedNewContent = newContent;

    differences.forEach((part: any) => {
      if (part.removed && highlightedOldContent.includes(part.value)) {
        const escapedValue = part.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedOldContent = highlightedOldContent.replace(
          new RegExp(escapedValue, 'g'),
          `<mark class="bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-100 px-1 rounded">${part.value}</mark>`
        );
      }
      if (part.added && highlightedNewContent.includes(part.value)) {
        const escapedValue = part.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlightedNewContent = highlightedNewContent.replace(
          new RegExp(escapedValue, 'g'),
          `<mark class="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 px-1 rounded">${part.value}</mark>`
        );
      }
    });

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold text-sm border-l-4 border-red-500">
            Original
          </div>
          <div className="border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 max-h-96 overflow-y-auto">
            {oldContent.trim() ? (
              <ReactMarkdown
                className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm prose-pre:text-xs"
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                remarkPlugins={[remarkGfm]}
              >
                {highlightedOldContent}
              </ReactMarkdown>
            ) : (
              <div className="text-gray-500 italic">Empty content</div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold text-sm border-l-4 border-green-500">
            Modified
          </div>
          <div className="border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 max-h-96 overflow-y-auto">
            {newContent.trim() ? (
              <ReactMarkdown
                className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:text-sm prose-pre:text-xs"
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                remarkPlugins={[remarkGfm]}
              >
                {highlightedNewContent}
              </ReactMarkdown>
            ) : (
              <div className="text-gray-500 italic">Empty content</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Raw view - show line by line diff
  const oldLines: { text: string; type: "removed" | "unchanged" | "placeholder" }[] = [];
  const newLines: { text: string; type: "added" | "unchanged" | "placeholder" }[] = [];

  differences.forEach((part: any) => {
    const lines = part.value.split('\n').filter((line: string, i: number, arr: string[]) => 
      i < arr.length - 1 || line.length > 0
    );

    if (part.removed) {
      lines.forEach((line: string) => {
        oldLines.push({ text: line, type: "removed" });
        newLines.push({ text: "", type: "placeholder" });
      });
    } else if (part.added) {
      lines.forEach((line: string) => {
        oldLines.push({ text: "", type: "placeholder" });
        newLines.push({ text: line, type: "added" });
      });
    } else {
      lines.forEach((line: string) => {
        oldLines.push({ text: line, type: "unchanged" });
        newLines.push({ text: line, type: "unchanged" });
      });
    }
  });

  return (
    <div className="font-mono text-sm overflow-x-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold">
            Original
          </div>
          {oldLines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "border-l-4 px-2",
                line.type === "removed"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300"
                  : line.type === "placeholder"
                  ? "bg-gray-100 dark:bg-gray-900 border-transparent"
                  : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300"
              )}
            >
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold">
            Modified
          </div>
          {newLines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "border-l-4 px-2",
                line.type === "added"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300"
                  : line.type === "placeholder"
                  ? "bg-gray-100 dark:bg-gray-900 border-transparent"
                  : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300"
              )}
            >
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}