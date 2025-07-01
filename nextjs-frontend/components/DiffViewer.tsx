"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { diffChars, diffWords, diffLines } from "diff";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  viewMode?: "inline" | "split";
  className?: string;
}

export function DiffViewer({
  oldContent,
  newContent,
  viewMode = "inline",
  className,
}: DiffViewerProps) {
  const differences = diffLines(oldContent, newContent, { ignoreWhitespace: false });

  if (viewMode === "split") {
    return <SplitDiffView differences={differences} className={className} />;
  }

  return <InlineDiffView differences={differences} className={className} />;
}

function InlineDiffView({ differences, className }: any) {
  return (
    <div className={cn("font-mono text-sm overflow-x-auto", className)}>
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

function SplitDiffView({ differences, className }: any) {
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

  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className={cn("font-mono text-sm overflow-x-auto", className)}>
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