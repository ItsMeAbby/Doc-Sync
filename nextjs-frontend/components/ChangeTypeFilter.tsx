"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  FileEdit, 
  FilePlus, 
  Check, 
  X, 
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChangeType = "edit" | "create" | "all";

interface ChangeTypeFilterProps {
  activeFilter: ChangeType;
  onFilterChange: (filter: ChangeType) => void;
  editCount: number;
  createCount: number;
  selectedCount: number;
  onApplySelected: () => void;
  onApplyAll: () => void;
  onIgnoreSelected: () => void;
  onIgnoreAll: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  disabled?: boolean;
}

export function ChangeTypeFilter({
  activeFilter,
  onFilterChange,
  editCount,
  createCount,
  selectedCount,
  onApplySelected,
  onApplyAll,
  onIgnoreSelected,
  onIgnoreAll,
  onSelectAll,
  onDeselectAll,
  disabled = false,
}: ChangeTypeFilterProps) {
  const totalCount = editCount + createCount;

  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b">
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
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={disabled || totalCount === 0}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Apply
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Apply Changes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onApplySelected}
                disabled={selectedCount === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Apply Selected ({selectedCount})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onApplyAll}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply All ({totalCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || totalCount === 0}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Ignore
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ignore Changes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onIgnoreSelected}
                disabled={selectedCount === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Ignore Selected ({selectedCount})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onIgnoreAll}>
                <XCircle className="h-4 w-4 mr-2" />
                Ignore All ({totalCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}