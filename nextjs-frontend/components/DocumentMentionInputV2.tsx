"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { fetchDocumentsWithCache } from "@/app/api/documents";

interface DocumentOption {
  id: string;
  title: string;
  path: string;
  language: "en" | "ja";
  isApiRef: boolean;
}

interface DocumentMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function DocumentMentionInputV2({
  value,
  onChange,
  disabled = false,
  placeholder = "Describe what changed or what needs to be updated...",
  rows = 4,
  className = "",
}: DocumentMentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionText, setMentionText] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load documents when component mounts
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await fetchDocumentsWithCache();
      const docs: DocumentOption[] = [];

      // Extract documents from all languages
      for (const [lang, content] of Object.entries(data)) {
        const contentData = content as any;
        const extractDocs = (items: any[], isApiRef: boolean = false) => {
          items.forEach((item) => {
            docs.push({
              id: item.id,
              title: item.title || item.name,
              path: item.path || "",
              language: lang as "en" | "ja",
              isApiRef,
            });
            if (item.children) {
              extractDocs(item.children, isApiRef);
            }
          });
        };

        if (contentData.documentation) {
          extractDocs(contentData.documentation, false);
        }
        if (contentData.api_references) {
          extractDocs(contentData.api_references, true);
        }
      }

      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents based on mention text
  const filteredDocuments = useMemo(() => {
    if (!mentionText.trim()) return documents;

    const searchTerm = mentionText.toLowerCase();
    return documents
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm) ||
          doc.path.toLowerCase().includes(searchTerm),
      )
      .slice(0, 10); // Limit to 10 results
  }, [documents, mentionText]);

  // Function to render text with highlighted mentions
  const renderHighlightedText = (text: string) => {
    const mentionRegex = /@[\w-]+/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>,
        );
      }
      // Add highlighted mention
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 font-medium border border-blue-200 dark:border-blue-600"
        >
          {match[0]}
        </span>,
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
      );
    }

    return parts.length > 0 ? parts : [<span key="empty">{text}</span>];
  };

  // Handle textarea input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for @ mentions
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      // Check if we're in a mention (no spaces after @)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionText(textAfterAt);
        setMentionPosition({ start: lastAtIndex, end: cursorPos });
        setShowDropdown(true);
        setHighlightedIndex(0);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }
  };

  // Handle document selection
  const selectDocument = (doc: DocumentOption) => {
    const mentionReplacement = `@${doc.id}`;
    const newValue =
      value.slice(0, mentionPosition.start) +
      mentionReplacement +
      value.slice(mentionPosition.end);
    onChange(newValue);
    setShowDropdown(false);

    // Focus back to textarea
    if (textareaRef.current) {
      const newCursorPos = mentionPosition.start + mentionReplacement.length;
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredDocuments.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredDocuments.length - 1,
        );
        break;
      case "Enter":
        if (filteredDocuments[highlightedIndex]) {
          e.preventDefault();
          selectDocument(filteredDocuments[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  // Get language badge color
  const getLanguageBadgeColor = (language: string) => {
    switch (language) {
      case "en":
        return "bg-green-100 text-green-800 border-green-200";
      case "ja":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get document type badge color
  const getTypeBadgeColor = (isApiRef: boolean) => {
    return isApiRef
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-700 border-gray-200";
  };

  const lineHeight = `${rows * 1.5}rem`;

  return (
    <div className="relative">
      {/* Container for both textarea and highlighting */}
      <div className="relative">
        {/* Invisible div with highlighting for visual effect */}
        <div
          className={`absolute inset-0 p-3 sm:p-4 rounded-md pointer-events-none whitespace-pre-wrap break-words text-sm sm:text-base overflow-hidden border border-transparent ${className}`}
          style={{
            minHeight: lineHeight,
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
        >
          <div className="opacity-0">{value}</div>
          <div className="absolute inset-0 p-3 sm:p-4">
            {renderHighlightedText(value)}
          </div>
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          className={`relative w-full p-3 sm:p-4 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 text-sm sm:text-base resize-none ${className}`}
          style={{
            minHeight: lineHeight,
            background: "rgba(255,255,255,0.95)",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="p-3 text-sm text-gray-500">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No documents found</div>
          ) : (
            filteredDocuments.map((doc, index) => (
              <div
                key={`${doc.id}-${doc.language}`}
                className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                  index === highlightedIndex
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={() => selectDocument(doc)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {doc.path}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                      Will insert:{" "}
                      <span className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200 font-medium border border-blue-200 dark:border-blue-600 font-mono">
                        @{doc.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getLanguageBadgeColor(doc.language)}`}
                    >
                      {doc.language.toUpperCase()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getTypeBadgeColor(doc.isApiRef)}`}
                      title={doc.isApiRef ? "API Reference" : "Documentation"}
                    >
                      {doc.isApiRef ? "API" : "DOC"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
