'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FileText, FolderPlus, ArrowLeft, Plus, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-900">
      {/* Redirecting overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 flex flex-col items-center space-y-4 shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Success!</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
              Document created successfully. Redirecting to documentation...
            </p>
          </Card>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/documentation')}
            className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documentation
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create New Documentation</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Create a new document or parent folder for your documentation.</p>
        </div>
      
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'parent' | 'document')}>
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white dark:bg-gray-800 shadow-sm">
            <TabsTrigger value="parent" className="flex items-center gap-2 text-sm font-medium">
              <FolderPlus className="w-4 h-4" />
              Create Parent Folder
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              Create Document
            </TabsTrigger>
          </TabsList>
        
          <TabsContent value="parent">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FolderPlus className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Parent Folder</h2>
                    <p className="text-gray-600 dark:text-gray-400">Create a new parent container for organizing documents</p>
                  </div>
                </div>
                
                <form onSubmit={handleCreateParent}>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="parentName" className="text-sm font-medium text-gray-900 dark:text-white">
                        Folder Name
                      </Label>
                      <Input 
                        id="parentName" 
                        value={parentName} 
                        onChange={(e) => setParentName(e.target.value)} 
                        placeholder="e.g., API Reference, Getting Started" 
                        required 
                        className="h-12 text-base"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        This will be used to generate the URL path (e.g., "api-reference/")
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="isApiRef" 
                        checked={isApiRef} 
                        onCheckedChange={() => setIsApiRef(!isApiRef)}
                      />
                      <Label htmlFor="isApiRef" className="text-sm font-medium text-gray-900 dark:text-white">
                        Mark as API Reference Section
                      </Label>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Creating Folder...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 mr-2" />
                          Create Parent Folder
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </TabsContent>
        
          <TabsContent value="document">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Document</h2>
                    <p className="text-gray-600 dark:text-gray-400">Create a new documentation page with content</p>
                  </div>
                </div>
                
                <form onSubmit={handleCreateDocument}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="documentName" className="text-sm font-medium text-gray-900 dark:text-white">
                          Document Name
                        </Label>
                        <Input 
                          id="documentName" 
                          value={documentName} 
                          onChange={(e) => setDocumentName(e.target.value)} 
                          placeholder="e.g., quick-start-guide" 
                          required 
                          className="h-12 text-base"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Used for URL generation (lowercase, hyphenated)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="documentTitle" className="text-sm font-medium text-gray-900 dark:text-white">
                          Display Title
                        </Label>
                        <Input 
                          id="documentTitle" 
                          value={documentTitle} 
                          onChange={(e) => setDocumentTitle(e.target.value)} 
                          placeholder="e.g., Quick Start Guide" 
                          className="h-12 text-base"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Human-readable title shown in the interface
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="documentParentId" className="text-sm font-medium text-gray-900 dark:text-white">
                          Parent Folder
                        </Label>
                        {loadingParents ? (
                          <div className="flex items-center space-x-2 py-3 px-4 border rounded-lg">
                            <Spinner size="sm" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Loading parent folders...</span>
                          </div>
                        ) : (
                          <Select value={documentParentId} onValueChange={(parentId) => {
                            setDocumentParentId(parentId);
                            // Auto-uncheck Reference if Doc parent is selected and checkbox is currently checked
                            if (parentId && documentIsApiRef) {
                              const selectedParent = parentDocuments.find(p => p.id === parentId);
                              if (selectedParent && !selectedParent.is_api_ref) {
                                // Parent is Doc type, so uncheck API Reference for child
                                setDocumentIsApiRef(false);
                              }
                            }
                          }}>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Select parent folder (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No Parent (Root Document)</SelectItem>
                              {parentDocuments.map((parent) => (
                                <SelectItem key={parent.id} value={parent.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    <span 
                                      className={`px-1.5 py-0.5 text-xs font-medium rounded border flex-shrink-0 ${
                                        parent.is_api_ref 
                                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                      title={parent.is_api_ref ? 'API Reference' : 'Documentation'}
                                    >
                                      {parent.is_api_ref ? 'API' : 'Doc'}
                                    </span>
                                    <span className="flex-1 truncate">
                                      {parent.name}{parent.title ? ` - ${parent.title}` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="documentLanguage" className="text-sm font-medium text-gray-900 dark:text-white">
                          Language
                        </Label>
                        <Select value={documentLanguage} onValueChange={setDocumentLanguage}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ja">Japanese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="documentIsApiRef" 
                          checked={documentIsApiRef} 
                          onCheckedChange={(checked) => setDocumentIsApiRef(checked === true)}
                        />
                        <Label htmlFor="documentIsApiRef" className="text-sm font-medium text-gray-900 dark:text-white">
                          Mark as API Reference
                        </Label>
                      </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="documentContent" className="text-sm font-medium text-gray-900 dark:text-white">
                          Content (Markdown)
                        </Label>
                        <textarea 
                          id="documentContent" 
                          value={documentContent} 
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocumentContent(e.target.value)} 
                          placeholder="# Document Title&#10;&#10;Enter your markdown content here...&#10;&#10;## Section&#10;&#10;Add your documentation content." 
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 min-h-[300px] text-base font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical" 
                          required
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Supports full Markdown syntax including code blocks and tables
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Creating Document...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 mr-2" />
                          Create Document
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
