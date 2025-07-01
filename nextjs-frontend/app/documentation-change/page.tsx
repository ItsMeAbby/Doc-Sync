'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DocumentationChangePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryParam = searchParams.get('query');
    const docIdParam = searchParams.get('documentId');
    if (queryParam) {
      setQuery(queryParam);
    }
    if (docIdParam) {
      setDocumentId(docIdParam);
      fetchDocumentDetails(docIdParam);
    }
  }, [searchParams]);

  const fetchDocumentDetails = async (docId: string) => {
    try {
      setLoadingDoc(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await res.json();
      
      // Search for the document in all languages and categories
      let foundDoc = null;
      for (const lang in data) {
        // Search in documentation
        const searchInDocs = (docs: any[]): any => {
          for (const doc of docs) {
            if (doc.id === docId) {
              return { ...doc, language: lang };
            }
            if (doc.children) {
              const found = searchInDocs(doc.children);
              if (found) return found;
            }
          }
          return null;
        };

        foundDoc = searchInDocs(data[lang].documentation);
        if (!foundDoc) {
          foundDoc = searchInDocs(data[lang].api_references);
        }
        if (foundDoc) break;
      }

      if (foundDoc) {
        setDocumentDetails(foundDoc);
      }
    } catch (err) {
      console.error('Error fetching document details:', err);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleViewDocument = () => {
    if (documentDetails && documentId) {
      // Store the document details in sessionStorage to select it on the documentation page
      sessionStorage.setItem('selectedDocumentId', documentId);
      sessionStorage.setItem('selectedLanguage', documentDetails.language || 'en');
      sessionStorage.setItem('selectedTab', documentDetails.is_api_ref ? 'api_references' : 'documentation');
      router.push('/documentation');
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      alert('Please enter a description of the documentation changes');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResponse(null);

      const payload: any = {
        query: query.trim(),
      };
      
      if (documentId) {
        payload.document_id = documentId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/edit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-6">
        <Link href="/documentation">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Documentation Change Request</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Describe what needs to be updated in the documentation and the system will analyze the impact.
        </p>
      </div>

      <Card className="p-4 sm:p-6 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">
          Describe your documentation update
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter a natural language description of what changed or what needs to be updated in the documentation.
          Example: "We don't support agents as_tool anymore, other agents should only be invoked via handoff"
        </p>
        
        {documentId && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            {loadingDoc ? (
              <div className="flex items-center space-x-2">
                <Spinner size="sm" />
                <span className="text-sm text-blue-600 dark:text-blue-400">Loading document details...</span>
              </div>
            ) : documentDetails ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Name:</strong> {documentDetails.name || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Title:</strong> {documentDetails.title || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Language:</strong> {documentDetails.language || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Type:</strong> {documentDetails.is_api_ref ? 'API Reference' : 'Documentation'}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    This update request will be specifically analyzed for this document.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewDocument}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Document ID: {documentId}
              </p>
            )}
          </div>
        )}
        
        <textarea
          className="w-full p-3 sm:p-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4 text-sm sm:text-base"
          rows={4}
          placeholder="Describe what changed or what needs to be updated..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !query.trim()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            'Analyze Documentation Impact'
          )}
        </Button>
      </Card>

      {error && (
        <Card className="p-4 sm:p-6 mb-6 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Error
          </h3>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </Card>
      )}

      {response && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">
            Analysis Results
          </h3>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
            <pre className="text-xs sm:text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}