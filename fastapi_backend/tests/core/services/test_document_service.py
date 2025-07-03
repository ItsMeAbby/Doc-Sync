import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.services.document_service import DocumentService
from app.models.documents import DocumentCreate, DocumentContentCreate
from app.core.exceptions import ValidationError, DocumentNotFoundError


class TestDocumentService:
    """Test the DocumentService class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.service = DocumentService()
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.process_document_content')
    @patch('app.core.services.document_service.DocumentRepository')
    @patch('app.core.services.document_service.ContentRepository')
    async def test_create_document_with_content_success(self, mock_content_repo_class, mock_doc_repo_class, mock_process_content):
        """Test successful document creation with content"""
        # Mock the repository instances
        mock_doc_repo = AsyncMock()
        mock_content_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        mock_content_repo_class.return_value = mock_content_repo
        
        # Mock responses
        mock_doc_repo.create_document = AsyncMock(return_value={"id": "doc-123", "name": "test.md"})
        mock_process_content.return_value = {
            "keywords_array": ["test", "document"],
            "urls_array": ["http://example.com"],
            "summary": "Test summary"
        }
        mock_content_repo.create_content = AsyncMock(return_value={"id": "content-123", "version": "1.0"})
        mock_doc_repo.update_current_version = AsyncMock()
        
        # Create test data
        document = DocumentCreate(name="test.md", path="/test", title="Test Document")
        content = DocumentContentCreate(
            markdown_content="# Test Content",
            language="en",
            version="1.0"
        )
        
        service = DocumentService()
        result = await service.create_document(document, content)
        
        assert result["id"] == "doc-123"
        assert result["current_version_id"] == "1.0"
        mock_doc_repo.create_document.assert_called_once()
        mock_content_repo.create_content.assert_called_once()
        mock_doc_repo.update_current_version.assert_called_once()
        mock_content_repo.create_content.assert_called_once()
        mock_doc_repo.update_current_version.assert_called_once_with("doc-123", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    @patch('app.core.services.document_service.ContentRepository')
    async def test_create_document_without_content(self, mock_content_repo_class, mock_doc_repo_class):
        """Test document creation without content"""
        mock_doc_repo = AsyncMock()
        mock_content_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        mock_content_repo_class.return_value = mock_content_repo
        
        mock_doc_repo.create_document = AsyncMock(return_value={"id": "doc-123", "name": "test.md"})
        
        document = DocumentCreate(name="test.md", path="/test", title="Test Document")
        
        service = DocumentService()
        result = await service.create_document(document, None)
        
        assert result["id"] == "doc-123"
        assert result["current_version_id"] is None
        mock_doc_repo.create_document.assert_called_once()
        mock_content_repo.create_content.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_create_document_missing_name(self):
        """Test document creation with missing name"""
        document = DocumentCreate(name="", path="/test", title="Test Document")
        
        service = DocumentService()
        with pytest.raises(ValidationError, match="Path and name are required fields"):
            await service.create_document(document)
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_root_documents_success(self, mock_doc_repo_class):
        """Test successful root documents retrieval"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_documents = [
            {"id": "doc-1", "title": "Root Doc 1", "parent_id": None},
            {"id": "doc-2", "title": "Root Doc 2", "parent_id": None}
        ]
        
        mock_doc_repo.get_root_documents = AsyncMock(return_value=mock_documents)
        service = DocumentService()
        result = await service.get_root_documents(is_api_ref=True)
        
        assert len(result) == 2
        assert result[0]["id"] == "doc-1"
        assert result[1]["id"] == "doc-2"
        mock_doc_repo.get_root_documents.assert_called_once_with(True)
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_document_success(self, mock_doc_repo_class):
        """Test successful document retrieval"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_document = {"id": "doc-123", "title": "Test Document"}
        mock_doc_repo.get_document_by_id = AsyncMock(return_value=mock_document)
        
        service = DocumentService()
        result = await service.get_document("doc-123")
        
        assert result == mock_document
        mock_doc_repo.get_document_by_id.assert_called_once_with("doc-123")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.ContentRepository')
    async def test_list_document_versions_success(self, mock_content_repo_class):
        """Test successful document versions listing"""
        mock_content_repo = AsyncMock()
        mock_content_repo_class.return_value = mock_content_repo
        
        mock_versions = [
            {"version": "2.0", "created_at": "2023-01-02T00:00:00Z"},
            {"version": "1.0", "created_at": "2023-01-01T00:00:00Z"}
        ]
        mock_content_repo.get_document_versions = AsyncMock(return_value=mock_versions)
        
        service = DocumentService()
        result = await service.list_document_versions("doc-123")
        
        assert len(result) == 2
        assert result[0]["version"] == "2.0"
        mock_content_repo.get_document_versions.assert_called_once_with("doc-123")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    @patch('app.core.services.document_service.ContentRepository')
    async def test_get_document_version_specific_version(self, mock_content_repo_class, mock_doc_repo_class):
        """Test getting a specific document version"""
        mock_doc_repo = AsyncMock()
        mock_content_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        mock_content_repo_class.return_value = mock_content_repo
        
        mock_doc_repo.get_document_by_id = AsyncMock(return_value={
            "id": "doc-123",
            "name": "test.md",
            "title": "Test Document",
            "path": "/test"
        })
        mock_content_repo.get_document_version = AsyncMock(return_value={
            "version": "1.0",
            "markdown_content": "# Version 1.0"
        })
        
        service = DocumentService()
        result = await service.get_document_version("doc-123", "1.0")
        
        assert result["version"] == "1.0"
        assert result["name"] == "test.md"
        assert result["title"] == "Test Document"
        assert result["path"] == "/test"
        mock_content_repo.get_document_version.assert_called_once_with("doc-123", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    @patch('app.core.services.document_service.ContentRepository')
    async def test_get_document_version_latest(self, mock_content_repo_class, mock_doc_repo_class):
        """Test getting the latest document version"""
        mock_doc_repo = AsyncMock()
        mock_content_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        mock_content_repo_class.return_value = mock_content_repo
        
        mock_doc_repo.get_document_by_id = AsyncMock(return_value={
            "id": "doc-123",
            "current_version_id": "2.0",
            "name": "test.md",
            "title": "Test Document",
            "path": "/test"
        })
        mock_content_repo.get_document_version = AsyncMock(return_value={
            "version": "2.0",
            "markdown_content": "# Latest version"
        })
        
        service = DocumentService()
        result = await service.get_document_version("doc-123", "latest")
        
        assert result["version"] == "2.0"
        mock_content_repo.get_document_version.assert_called_once_with("doc-123", "2.0")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_document_version_latest_no_versions(self, mock_doc_repo_class):
        """Test getting latest version when no versions exist"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_doc_repo.get_document_by_id = AsyncMock(return_value={
            "id": "doc-123",
            "current_version_id": None
        })
        
        service = DocumentService()
        
        with pytest.raises(DocumentNotFoundError, match="No versions found for this document"):
            await service.get_document_version("doc-123", "latest")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_child_documents_success(self, mock_doc_repo_class):
        """Test successful child documents retrieval"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_children = [
            {"id": "child-1", "parent_id": "parent-123"},
            {"id": "child-2", "parent_id": "parent-123"}
        ]
        mock_doc_repo.get_child_documents = AsyncMock(return_value=mock_children)
        
        service = DocumentService()
        result = await service.get_child_documents("parent-123")
        
        assert len(result) == 2
        assert result[0]["id"] == "child-1"
        mock_doc_repo.get_child_documents.assert_called_once_with("parent-123")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_document_parents_success(self, mock_doc_repo_class):
        """Test successful document parents retrieval"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_parents = [
            {"id": "parent-123", "title": "Parent Document"},
            {"id": "grandparent-123", "title": "Grandparent Document"}
        ]
        mock_doc_repo.get_document_parents = AsyncMock(return_value=mock_parents)
        
        service = DocumentService()
        result = await service.get_document_parents("child-123")
        
        assert len(result) == 2
        assert result[0]["id"] == "parent-123"
        mock_doc_repo.get_document_parents.assert_called_once_with("child-123")
    
    @pytest.mark.asyncio
    @patch('app.core.services.document_service.build_tree')
    @patch('app.core.services.document_service.DocumentRepository')
    async def test_get_all_documents_success(self, mock_doc_repo_class, mock_build_tree):
        """Test successful get all documents with hierarchy"""
        mock_doc_repo = AsyncMock()
        mock_doc_repo_class.return_value = mock_doc_repo
        
        mock_documents = [
            {
                "id": "doc-1", 
                "title": "Document 1",
                "is_api_ref": False,
                "language": "en",
                "document_contents": {
                    "markdown_content": "# Document 1",
                    "language": "en",
                    "keywords_array": ["doc1"]
                }
            },
            {
                "id": "doc-2", 
                "title": "Document 2",
                "is_api_ref": True,
                "language": "en",
                "document_contents": {
                    "markdown_content": "# Document 2",
                    "language": "en",
                    "keywords_array": ["doc2"]
                }
            }
        ]
        mock_doc_repo.get_all_documents = AsyncMock(return_value=mock_documents)
        mock_build_tree.return_value = {"documents": mock_documents, "tree": []}
        
        service = DocumentService()
        result = await service.get_all_documents(is_deleted=False, is_api_ref=True)
        
        assert "en" in result  # Should have language-based grouping
        mock_doc_repo.get_all_documents.assert_called_once_with(False, True, None)
        # build_tree is called multiple times (once for each language and document type)
        assert mock_build_tree.call_count > 0
