'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  documentId?: string;
  keywords_array?: string[];
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, documentId, keywords_array = [] }) => {
  if (!content) {
    return (
      <div className="text-center text-gray-500 py-10">
        No content available
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <div className="flex flex-col mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {keywords_array && keywords_array.length > 0 ? (
            keywords_array.map((keyword, index) => (
              <span 
                key={index} 
                className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {keyword}
              </span>
            ))
          ) : null}
        </div>
        <div className="flex justify-end">
          <button 
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            onClick={() => alert('This would open the documentation update form for document ID: ' + documentId)}
          >
            Suggest Update
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <ReactMarkdown
          className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400"
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownRenderer;