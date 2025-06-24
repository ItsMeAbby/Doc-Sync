'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DocumentTree from './components/DocumentTree';
import MarkdownRenderer from './components/MarkdownRenderer';
import LanguageSelector from './components/LanguageSelector';
import { DocumentNode } from './types';
import { FaLightbulb } from 'react-icons/fa';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export default function DocumentationPage() {
  const [documents, setDocuments] = useState<Record<string, { documentation: DocumentNode[], api_references: DocumentNode[] }>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedDocument, setSelectedDocument] = useState<DocumentNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'documentation' | 'api_references'>('documentation');
  const [updateMode, setUpdateMode] = useState<boolean>(false);
  const [updateQuery, setUpdateQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`);
        
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
          
          // Set default language if available
          const languages = Object.keys(data);
          if (languages.length > 0 && !languages.includes(selectedLanguage)) {
            setSelectedLanguage(languages[0]);
          }
        } else {
          const errorMessage = `Failed to fetch documents: ${response.status} ${response.statusText}`;
          console.error(errorMessage);
          console.error(`API URL: ${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`);
          // For debugging purposes - log the response body if possible
          try {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            setError(errorMessage + '. Please check that the backend server is running.');
          } catch (e) {
            console.error('Could not read error response body');
            setError(errorMessage + '. Please check that the backend server is running.');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching documents:', error);
        setError(`Failed to connect to the backend server: ${errorMessage}. Please check that the backend server is running at ${process.env.NEXT_PUBLIC_API_BASE_URL}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleDocumentSelect = (document: DocumentNode) => {
    setSelectedDocument(document);
    setUpdateMode(false);
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setSelectedDocument(null);
    setUpdateMode(false);
  };

  const handleUpdateRequest = () => {
    if (!updateQuery.trim()) {
      alert('Please enter a description of the documentation changes');
      return;
    }
    
    // This would actually send the query to the backend for processing
    alert(`Your update request has been received: "${updateQuery}"\n\nThe system would now analyze the documentation and suggest updates.`);
    
    // In a real implementation, this would be replaced with actual API calls and state updates
    setUpdateMode(false);
    setUpdateQuery('');
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <LanguageSelector
          languages={Object.keys(documents)}
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
        
        <Button
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500"
          onClick={() => setUpdateMode(true)}
        >
          <FaLightbulb className="h-4 w-4" />
          Suggest Documentation Update
        </Button>
      </div>

      {updateMode && (
        <Card className="p-3 sm:p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-base sm:text-lg font-medium mb-2 sm:mb-3 text-blue-800 dark:text-blue-300">
            Describe your documentation update
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
            Enter a natural language description of what changed or what needs to be updated in the documentation.
            Example: "We don't support agents as_tool anymore, other agents should only be invoked via handoff"
          </p>
          <textarea
            className="w-full p-2 sm:p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 text-sm sm:text-base"
            rows={3}
            placeholder="Describe what changed or what needs to be updated..."
            value={updateQuery}
            onChange={(e) => setUpdateQuery(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setUpdateMode(false)} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleUpdateRequest} className="order-1 sm:order-2 mb-2 sm:mb-0">
              Find Affected Documentation
            </Button>
          </div>
        </Card>
      )}

      {error ? (
        <Card className="p-4 sm:p-6 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 mb-4">
          <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-medium text-red-700 dark:text-red-400 mb-3 sm:mb-4">
              Connection Error
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4 sm:mb-6 max-w-md text-sm sm:text-base">
              {error}
            </p>
            <Button onClick={() => {
              setError(null);
              setLoading(true);
              // Retry the fetch
              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`)
                .then(response => {
                  if (response.ok) return response.json();
                  throw new Error(`Failed to fetch: ${response.status}`);
                })
                .then(data => {
                  setDocuments(data);
                  setLoading(false);
                })
                .catch(err => {
                  setError(`Failed to connect: ${err.message}. Please check the backend server.`);
                  setLoading(false);
                });
            }}>
              Retry Connection
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left sidebar - Document tree (20% width) */}
          <div className="w-full lg:w-1/5 mb-4 lg:mb-0">
            <Card className="p-4 h-full overflow-auto">
              <Tabs defaultValue="documentation" value={activeTab} onValueChange={(value) => setActiveTab(value as 'documentation' | 'api_references')}>
                <TabsList className="w-full">
                  <TabsTrigger value="documentation" className="flex-1">Documentation</TabsTrigger>
                  <TabsTrigger value="api_references" className="flex-1">API References</TabsTrigger>
                </TabsList>
                <TabsContent value="documentation" className="mt-4">
                  {documents[selectedLanguage]?.documentation ? (
                    <DocumentTree
                      documents={documents[selectedLanguage].documentation}
                      onSelectDocument={handleDocumentSelect}
                      selectedDocument={selectedDocument}
                      isLoading={loading}
                    />
                  ) : (
                    <div>No documentation available</div>
                  )}
                </TabsContent>
                <TabsContent value="api_references" className="mt-4">
                  {documents[selectedLanguage]?.api_references ? (
                    <DocumentTree
                      documents={documents[selectedLanguage].api_references}
                      onSelectDocument={handleDocumentSelect}
                      selectedDocument={selectedDocument}
                      isLoading={loading}
                    />
                  ) : (
                    <div>No API references available</div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Main content area - Markdown renderer */}
          <div className="w-full lg:w-4/5">
            <Card className="p-2 sm:p-4 h-full">
              {selectedDocument ? (
                <MarkdownRenderer 
                  content={selectedDocument.markdown_content || ''} 
                  documentId={selectedDocument.id}
                  keywords_array={selectedDocument.keywords_array}
                  isLoading={loading}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">
                    OpenAI Agents SDK Documentation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    This is a documentation viewer for the OpenAI Agents SDK. Select a document from the sidebar to view its content or use the "Suggest Documentation Update" button to identify documentation that needs to be updated.
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    <p className="font-medium mb-1">Example update suggestion:</p>
                    <p className="italic">"We don't support agents as_tool anymore, other agents should only be invoked via handoff"</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}