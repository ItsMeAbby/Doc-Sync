'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DocumentTree from './components/DocumentTree';
import MarkdownRenderer from './components/MarkdownRenderer';
import LanguageSelector from './components/LanguageSelector';
import { DocumentNode } from './types';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';
import { FaLightbulb } from 'react-icons/fa';
import { RefreshCw } from 'lucide-react';
import { fetchDocumentsWithCache, documentCache } from '@/app/utils/documentCache';

export default function DocumentationPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Record<string, { documentation: DocumentNode[], api_references: DocumentNode[] }>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedDocument, setSelectedDocument] = useState<DocumentNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'documentation' | 'api_references'>('documentation');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const data = await fetchDocumentsWithCache(process.env.NEXT_PUBLIC_API_BASE_URL || '');
        setDocuments(data);
          
          // Check for stored selection from documentation-change page
          const storedDocId = sessionStorage.getItem('selectedDocumentId');
          const storedLanguage = sessionStorage.getItem('selectedLanguage');
          const storedTab = sessionStorage.getItem('selectedTab');
          
          if (storedDocId && storedLanguage) {
            // Set language and tab
            setSelectedLanguage(storedLanguage);
            if (storedTab) {
              setActiveTab(storedTab as 'documentation' | 'api_references');
            }
            
            // Find and select the document
            const findDocument = (docs: any[]): any => {
              for (const doc of docs) {
                if (doc.id === storedDocId) {
                  return doc;
                }
                if (doc.children) {
                  const found = findDocument(doc.children);
                  if (found) return found;
                }
              }
              return null;
            };
            
            setTimeout(() => {
              const targetDocs = data[storedLanguage]?.[storedTab || 'documentation'] || [];
              const foundDoc = findDocument(targetDocs);
              if (foundDoc) {
                setSelectedDocument(foundDoc);
              }
              
              // Clear session storage
              sessionStorage.removeItem('selectedDocumentId');
              sessionStorage.removeItem('selectedLanguage');
              sessionStorage.removeItem('selectedTab');
            }, 100);
          } else {
            // Set default language if available
            const languages = Object.keys(data);
            if (languages.length > 0 && !languages.includes(selectedLanguage)) {
              setSelectedLanguage(languages[0]);
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
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    
    // Try to find the equivalent document in the new language
    if (selectedDocument) {
      const findDocumentByAttributes = (docs: DocumentNode[], targetPath?: string, targetParentId?: string, targetIsApiRef?: boolean): DocumentNode | null => {
        for (const doc of docs) {
          // Match by path, parent_id, and is_api_ref
          if (doc.path === targetPath && 
              doc.parent_id === targetParentId && 
              doc.is_api_ref === targetIsApiRef) {
            return doc;
          }
          if (doc.children) {
            const found = findDocumentByAttributes(doc.children, targetPath, targetParentId, targetIsApiRef);
            if (found) return found;
          }
        }
        return null;
      };

      // Look for the document in the new language
      const newLanguageDocs = documents[language];
      if (newLanguageDocs) {
        const docsToSearch = activeTab === 'documentation' 
          ? newLanguageDocs.documentation 
          : newLanguageDocs.api_references;
        
        const foundDoc = findDocumentByAttributes(
          docsToSearch || [], 
          selectedDocument.path, 
          selectedDocument.parent_id, 
          selectedDocument.is_api_ref
        );
        
        if (foundDoc) {
          setSelectedDocument(foundDoc);
        } else {
          // Document doesn't exist in new language, clear selection
          setSelectedDocument(null);
        }
      } else {
        // New language data not loaded yet, clear selection
        setSelectedDocument(null);
      }
    }
  };

  const handleRefresh = async () => {
    // Clear cache and refetch
    documentCache.invalidate('documents_all');
    setLoading(true);
    try {
      const data = await fetchDocumentsWithCache(process.env.NEXT_PUBLIC_API_BASE_URL || '');
      setDocuments(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to refresh: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <LanguageSelector
          languages={Object.keys(documents)}
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500"
            onClick={() => router.push('/documentation-change')}
          >
            <FaLightbulb className="h-4 w-4" />
            Suggest Documentation Update
          </Button>
        </div>
      </div>

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
              fetchDocumentsWithCache(process.env.NEXT_PUBLIC_API_BASE_URL || '')
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
                  document={selectedDocument}
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