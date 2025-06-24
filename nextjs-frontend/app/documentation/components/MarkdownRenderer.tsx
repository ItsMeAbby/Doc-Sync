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

  // Clean up problematic markdown patterns in the content
  const cleanContent = React.useMemo(() => {
    let cleanedContent = content;
    
    // Look for source code blocks with filenames
    cleanedContent = cleanedContent.replace(
      /Source code in\s+([^\n]+)\n/g,
      "```filename\n$1\n```\n"
    );
    
    // Fix tables with code blocks that have line numbers
    cleanedContent = cleanedContent.replace(
      /\|\s*\|\s*\|\n\|\s*---\s*\|\s*---\s*\|\n\|\s*```(?:<br>[\d<>br\/\s]+)+```\s*\|\s*```(?:[^`]+)```/g,
      (match) => {
        // Extract the actual code content from the second code block
        const codeMatch = match.match(/```md-code__content<br>([\s\S]*?)```/);
        if (codeMatch && codeMatch[1]) {
          return "```python\n" + codeMatch[1] + "\n```";
        }
        return match;
      }
    );

    // Fix other issues with line numbers in code blocks
    cleanedContent = cleanedContent.replace(
      /```(?:<br>\d+<br>)+([^`]+)```/g,
      "```\n$1\n```"
    );

    // Replace <br> tags within code blocks with actual line breaks
    cleanedContent = cleanedContent.replace(
      /```([^`]+?)```/g,
      (match, codeContent) => {
        const fixedCode = codeContent.replace(/<br>/g, '\n');
        return "```\n" + fixedCode + "\n```";
      }
    );
    
    // Transform code blocks with line numbers to add line-numbers class
    cleanedContent = cleanedContent.replace(
      /```([a-z-]*)\n(\d+\s+.*?(?:\n\d+\s+.*?)*)\n```/g,
      (match, language, codeWithLineNumbers) => {
        // Extract the line numbers and code
        const lines = codeWithLineNumbers.split('\n');
        const lineNumbers: string[] = [];
        const codeLines: string[] = [];
        
        lines.forEach((line: string) => {
          const lineMatch = line.match(/^(\d+)\s+(.*)/);
          if (lineMatch) {
            lineNumbers.push(lineMatch[1]);
            codeLines.push(lineMatch[2]);
          }
        });
        
        // Use the 'line-numbers' class to signal our custom renderer
        return "```" + (language || 'python') + "-with-line-numbers\n" + 
               lineNumbers.join(',') + "\n" + 
               codeLines.join('\n') + 
               "\n```";
      }
    );

    return cleanedContent;
  }, [content]);

  // Custom components for ReactMarkdown
  const components = {
    // Custom code block rendering
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline) {
        // Check if this is a filename block
        if (language === 'filename') {
          const filename = String(children).trim();
          return (
            <div className="mt-6 mb-0 rounded-t-md bg-gray-100 dark:bg-gray-700 py-2 px-4 border-b border-gray-300 dark:border-gray-600 flex items-center">
              <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{filename}</span>
            </div>
          );
        }
        
        // Check if this is a code block with line numbers
        if (language && language.endsWith('-with-line-numbers')) {
          const baseLang = language.replace('-with-line-numbers', '');
          const contentLines = String(children).split('\n');
          
          // First line contains the line numbers as comma-separated values
          const lineNumbers: string[] = contentLines[0].split(',');
          // Rest of the lines are the actual code
          const codeContent = contentLines.slice(1).join('\n');
          
          return (
            <div className="relative group">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  className="bg-gray-200 dark:bg-gray-700 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
                  }}
                  title="Copy code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <div className="flex overflow-x-auto">
                {/* Line numbers column */}
                <div className="flex-none pl-3 pr-2 pt-4 pb-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-right select-none border-r border-gray-300 dark:border-gray-600 font-mono text-sm">
                  {lineNumbers.map((num: string, idx: number) => (
                    <div key={idx}>{num}</div>
                  ))}
                </div>
                {/* Code content */}
                <pre className={`language-${baseLang} flex-grow m-0`}>
                  <code className={`language-${baseLang}`}>
                    {codeContent}
                  </code>
                </pre>
              </div>
            </div>
          );
        }
        
        return (
          <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="bg-gray-200 dark:bg-gray-700 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={() => {
                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                }}
                title="Copy code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <pre className={`language-${language || 'text'} ${className || ''} ${language === 'python' ? 'mt-0 rounded-t-none' : ''}`} {...props}>
              <code className={`language-${language || 'text'}`}>
                {String(children).replace(/\n$/, '')}
              </code>
            </pre>
          </div>
        );
      }
      
      return <code className={className} {...props}>{children}</code>;
    }
  };

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
          components={components}
        >
          {cleanContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownRenderer;