'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { documentCache } from '@/app/utils/documentCache';

interface ParentDocument {
  id: string;
  name: string;
  path?: string;
  title?: string;
  is_api_ref: boolean;
}

export default function CreateDocumentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'parent' | 'document'>('parent');
  const [parentDocuments, setParentDocuments] = useState<ParentDocument[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  
  // Parent document state
  const [parentName, setParentName] = useState('');
  const [isApiRef, setIsApiRef] = useState(false);
  
  // Document state
  const [documentName, setDocumentName] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentParentId, setDocumentParentId] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentLanguage, setDocumentLanguage] = useState('en');
  const [documentIsApiRef, setDocumentIsApiRef] = useState(false);
  
  // Fetch parent documents on component mount
  useEffect(() => {
    const fetchParentDocuments = async () => {
      setLoadingParents(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/root`);
        
        if (response.ok) {
          const data = await response.json();
          setParentDocuments(data);
        } else {
          console.error('Failed to fetch parent documents');
        }
      } catch (error) {
        console.error('Error fetching parent documents:', error);
      } finally {
        setLoadingParents(false);
      }
    };
    
    fetchParentDocuments();
  }, []);

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Calculate path by lowercasing name and replacing spaces with hyphens
      const path = parentName.toLowerCase().replace(/\s+/g, '-') + '/';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            name: parentName,
            is_api_ref: isApiRef,
            path: path,
          }
        }),
      });

      if (response.ok) {
        // Invalidate cache to force refresh on documentation page
        documentCache.invalidate('documents_all');
        
        // Show redirecting state
        setIsRedirecting(true);
        
        // Wait 1.5 seconds before redirecting for smooth transition
        setTimeout(() => {
          router.push('/documentation');
        }, 1500);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Failed to create parent document'}`);
      }
    } catch (error) {
      console.error('Error creating parent document:', error);
      alert('Failed to create parent document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Calculate path based on document name and parent
      let path = documentName.toLowerCase().replace(/\s+/g, '-');
      
      // If there's a parent ID, find that parent to get its path
      let parentPath = '';
      if (documentParentId) {
        const parent = parentDocuments.find(p => p.id === documentParentId);
        if (parent && parent.path) {
          parentPath = parent.path;
        }
      }
      
      // Combine paths and ensure it ends with a slash
      path = parentPath ? `${parentPath}${path}/` : `${path}/`;
      
      const documentData = {
        document: {
          name: documentName,
          title: documentTitle,
          is_api_ref: documentIsApiRef,
          parent_id: documentParentId || null,
          path: path
        },
        content: {
          markdown_content: documentContent,
          language: documentLanguage,
        }
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      if (response.ok) {
        // Invalidate cache to force refresh on documentation page
        documentCache.invalidate('documents_all');
        
        // Show redirecting state
        setIsRedirecting(true);
        
        // Wait 1.5 seconds before redirecting for smooth transition
        setTimeout(() => {
          router.push('/documentation');
        }, 1500);
      } else {
        const errorData = await response.json();
        alert(`Error creating document: ${errorData.detail || 'Failed to create document'}`);
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Redirecting overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="p-6 sm:p-8 flex flex-col items-center space-y-4">
            <Spinner size="lg" />
            <h2 className="text-xl sm:text-2xl font-semibold">Success!</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Document created successfully. Redirecting to documentation...
            </p>
          </Card>
        </div>
      )}
      
      <h1 className="text-2xl font-bold mb-6">Create New Documentation</h1>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'parent' | 'document')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="parent">Create Parent Folder</TabsTrigger>
          <TabsTrigger value="document">Create Document</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parent">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create Parent Document/Folder</h2>
            <form onSubmit={handleCreateParent}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="parentName">Name</Label>
                  <Input 
                    id="parentName" 
                    value={parentName} 
                    onChange={(e) => setParentName(e.target.value)} 
                    placeholder="Parent document name" 
                    required 
                  />
                  <p className="text-sm text-gray-500 mt-1">This will be used to generate the URL path</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isApiRef" 
                    checked={isApiRef} 
                    onChange={() => setIsApiRef(!isApiRef)} 
                    className="h-4 w-4" 
                  />
                  <Label htmlFor="isApiRef">Is API Reference</Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Parent Folder'}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="document">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create Document</h2>
            <form onSubmit={handleCreateDocument}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="documentName">Name</Label>
                  <Input 
                    id="documentName" 
                    value={documentName} 
                    onChange={(e) => setDocumentName(e.target.value)} 
                    placeholder="Document name" 
                    required 
                  />
                  <p className="text-sm text-gray-500 mt-1">This will be used to generate the URL path</p>
                </div>
                
                <div>
                  <Label htmlFor="documentTitle">Title</Label>
                  <Input 
                    id="documentTitle" 
                    value={documentTitle} 
                    onChange={(e) => setDocumentTitle(e.target.value)} 
                    placeholder="Document title" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="documentParentId">Parent Document</Label>
                  {loadingParents ? (
                    <div className="flex items-center space-x-2 py-2">
                      <Spinner size="sm" />
                      <span className="text-sm">Loading parent documents...</span>
                    </div>
                  ) : (
                    <select
                      id="documentParentId"
                      value={documentParentId}
                      onChange={(e) => setDocumentParentId(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- No Parent (Root Document) --</option>
                      {parentDocuments.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name}{parent.title ? ` - ${parent.title}` : ''}{parent.path ? ` (${parent.path})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Select a parent document for nesting</p>
                </div>
                
                <div>
                  <Label htmlFor="documentLanguage">Language</Label>
                  <select 
                    id="documentLanguage" 
                    value={documentLanguage} 
                    onChange={(e) => setDocumentLanguage(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="documentIsApiRef" 
                    checked={documentIsApiRef} 
                    onChange={() => setDocumentIsApiRef(!documentIsApiRef)} 
                    className="h-4 w-4" 
                  />
                  <Label htmlFor="documentIsApiRef">Is API Reference</Label>
                </div>
                
                <div>
                  <Label htmlFor="documentContent">Content (Markdown)</Label>
                  <textarea 
                    id="documentContent" 
                    value={documentContent} 
                    onChange={(e) => setDocumentContent(e.target.value)} 
                    placeholder="Enter markdown content" 
                    className="w-full border border-gray-300 rounded-md p-2 min-h-[200px]" 
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Document'}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/documentation')}>
          Cancel and Return to Documentation
        </Button>
      </div>
    </div>
  );
}
