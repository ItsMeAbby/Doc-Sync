"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  FilePlus,
  FileX,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

export type ChangeType = "edit" | "create" | "delete" | "all";

interface ChangeTypeFilterProps {
  activeFilter: ChangeType;
  onFilterChange: (filter: ChangeType) => void;
  editCount: number;
  createCount: number;
  deleteCount: number;
  selectedCount: number;
  onApply: () => void;
  onIgnore: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  disabled?: boolean;
}

export function ChangeTypeFilter({
  activeFilter,
  onFilterChange,
  editCount,
  createCount,
  deleteCount,
  selectedCount,
  onApply,
  onIgnore,
  onSelectAll,
  onDeselectAll,
  disabled = false,
}: ChangeTypeFilterProps) {
  const totalCount = editCount + createCount + deleteCount;

  return (
    <div className="p-4 border-b">
      {/* Mobile and Tablet layout: Stack vertically (up to large screens) */}
      <div className="flex flex-col gap-4 xl:hidden">
        {/* Filter buttons row */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("all")}
            disabled={disabled}
            className="gap-1 text-xs flex-1 min-w-0"
          >
            <Filter className="h-3 w-3" />
            All
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
              {totalCount}
            </Badge>
          </Button>
          <Button
            variant={activeFilter === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("edit")}
            disabled={disabled || editCount === 0}
            className="gap-1 text-xs flex-1 min-w-0"
          >
            <FileEdit className="h-3 w-3" />
            Edits
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
              {editCount}
            </Badge>
          </Button>
          <Button
            variant={activeFilter === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("create")}
            disabled={disabled || createCount === 0}
            className="gap-1 text-xs flex-1 min-w-0"
          >
            <FilePlus className="h-3 w-3" />
            New Files
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
              {createCount}
            </Badge>
          </Button>
          <Button
            variant={activeFilter === "delete" ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange("delete")}
            disabled={disabled || deleteCount === 0}
            className="gap-1 text-xs flex-1 min-w-0"
          >
            <FileX className="h-3 w-3" />
            Delete
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
              {deleteCount}
            </Badge>
          </Button>
        </div>

        {/* Selection and action buttons row */}
        <div className="flex flex-col gap-2">
          {selectedCount > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {selectedCount} selected
            </div>
          )}

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={disabled || totalCount === 0}
              className="text-xs flex-1"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              disabled={disabled || selectedCount === 0}
              className="text-xs flex-1"
            >
              Deselect All
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={onApply}
              disabled={disabled || selectedCount === 0}
              className="gap-1 text-xs flex-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              Apply ({selectedCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onIgnore}
              disabled={disabled || selectedCount === 0}
              className="gap-1 text-xs flex-1"
            >
              <XCircle className="h-3 w-3" />
              Ignore ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop layout: Single row (extra large screens only) */}
      <div className="hidden xl:flex xl:items-center xl:justify-between xl:gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("all")}
              disabled={disabled}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              All
              <Badge variant="secondary" className="ml-1">
                {totalCount}
              </Badge>
            </Button>
            <Button
              variant={activeFilter === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("edit")}
              disabled={disabled || editCount === 0}
              className="gap-2"
            >
              <FileEdit className="h-4 w-4" />
              Edits
              <Badge variant="secondary" className="ml-1">
                {editCount}
              </Badge>
            </Button>
            <Button
              variant={activeFilter === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("create")}
              disabled={disabled || createCount === 0}
              className="gap-2"
            >
              <FilePlus className="h-4 w-4" />
              New Files
              <Badge variant="secondary" className="ml-1">
                {createCount}
              </Badge>
            </Button>
            <Button
              variant={activeFilter === "delete" ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("delete")}
              disabled={disabled || deleteCount === 0}
              className="gap-2"
            >
              <FileX className="h-4 w-4" />
              Delete
              <Badge variant="secondary" className="ml-1">
                {deleteCount}
              </Badge>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
          )}

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={disabled || totalCount === 0}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              disabled={disabled || selectedCount === 0}
              className="text-xs"
            >
              Deselect All
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={onApply}
              disabled={disabled || selectedCount === 0}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply ({selectedCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onIgnore}
              disabled={disabled || selectedCount === 0}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Ignore ({selectedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
