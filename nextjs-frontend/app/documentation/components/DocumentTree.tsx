'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Search } from 'lucide-react';
import { DocumentNode } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

interface DocumentTreeProps {
  documents: DocumentNode[];
  onSelectDocument: (document: DocumentNode) => void;
  selectedDocument: DocumentNode | null;
  isLoading?: boolean;
}

const DocumentTreeNode: React.FC<{
  document: DocumentNode;
  onSelectDocument: (document: DocumentNode) => void;
  selectedDocument: DocumentNode | null;
  level: number;
  searchTerm?: string;
}> = ({ document, onSelectDocument, selectedDocument, level, searchTerm }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0 || Boolean(searchTerm));
  const hasChildren = document.children && document.children.length > 0;
  const isSelected = selectedDocument?.id === document.id;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    onSelectDocument(document);
  };

  // Use name field for display, fallback to title if name is not available
  const displayName = document.name || document.title || '';
  const displayTitle = searchTerm && displayName.toLowerCase().includes(searchTerm.toLowerCase()) ? (
    <span>
      {displayName.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> : part
      )}
    </span>
  ) : (
    <span className="truncate">{displayName}</span>
  );

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 sm:py-1 px-2 rounded-md text-sm sm:text-base ${
          hasChildren 
            ? 'cursor-default' 
            : 'cursor-pointer ' + (isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')
        }`}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={hasChildren ? handleToggle : handleSelect}
      >
        {hasChildren ? (
          <span className="mr-1 cursor-pointer" onClick={handleToggle}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="mr-1">
            <File className="h-4 w-4" />
          </span>
        )}
        {hasChildren ? (
          <span className="font-medium text-gray-700 dark:text-gray-300">{displayTitle}</span>
        ) : (
          displayTitle
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {document.children?.map((child) => (
            <DocumentTreeNode
              key={child.id}
              document={child}
              onSelectDocument={onSelectDocument}
              selectedDocument={selectedDocument}
              level={level + 1}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentTree: React.FC<DocumentTreeProps> = ({ documents, onSelectDocument, selectedDocument, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3 sticky top-0 z-10 bg-background">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search documentation..."
          className="pl-10 pr-4 py-2 w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="max-h-[calc(100vh-250px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto pb-2 -mx-1 px-1">
        {isLoading ? (
          <div className="space-y-2 p-2">
            <div className="flex items-center space-x-2 mb-3">
              <Spinner size="sm" />
              <span className="text-sm text-gray-500">Loading documents...</span>
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-11/12 ml-4" />
            <Skeleton className="h-6 w-10/12 ml-4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-11/12 ml-4" />
            <Skeleton className="h-6 w-10/12 ml-4" />
          </div>
        ) : documents.length > 0 ? (
          documents.map((doc) => (
            <DocumentTreeNode
              key={doc.id}
              document={doc}
              onSelectDocument={onSelectDocument}
              selectedDocument={selectedDocument}
              level={0}
              searchTerm={searchTerm}
            />
          ))
        ) : (
          <div className="p-2 text-gray-500">No documents available</div>
        )}
      </div>
    </div>
  );
};

export default DocumentTree;