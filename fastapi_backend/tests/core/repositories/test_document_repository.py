import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.core.repositories.document_repository import DocumentRepository
from app.core.exceptions import DocumentNotFoundError, DocumentCreationError, DocumentUpdateError


class TestDocumentRepository:
    """Test the DocumentRepository class"""
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_create_document_success(self, mock_supabase):
        """Test successful document creation"""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "test-id",
            "title": "Test Document",
            "path": "/test/path",
            "created_at": "2023-01-01T00:00:00Z"
        }]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_supabase.table.return_value = mock_table
        
        doc_data = {
            "title": "Test Document",
            "path": "/test/path",
            "name": "test.md"
        }
        
        result = await DocumentRepository.create_document(doc_data)
        
        assert result["id"] == "test-id"
        assert result["title"] == "Test Document"
        mock_table.insert.assert_called_once_with(doc_data)
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_create_document_no_data_returned(self, mock_supabase):
        """Test document creation failure when no data returned"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.insert().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentCreationError, match="Failed to insert document"):
            await DocumentRepository.create_document({"title": "Test"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_create_document_exception(self, mock_supabase):
        """Test document creation with database exception"""
        mock_supabase.table.side_effect = Exception("Database connection error")
        
        with pytest.raises(DocumentCreationError, match="Database connection error"):
            await DocumentRepository.create_document({"title": "Test"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_document_by_id_success(self, mock_supabase):
        """Test successful document retrieval by ID"""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "test-id",
            "title": "Test Document",
            "path": "/test/path",
            "is_deleted": False
        }]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_eq = MagicMock()
        mock_eq.execute = mock_execute
        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_document_by_id("test-id")
        
        assert result["id"] == "test-id"
        assert result["title"] == "Test Document"
        mock_table.select.assert_called_once_with("*")
        mock_select.eq.assert_called_once_with("id", "test-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_document_by_id_not_found(self, mock_supabase):
        """Test document not found error"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.select().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentNotFoundError):
            await DocumentRepository.get_document_by_id("nonexistent-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    @patch('app.core.repositories.document_repository.DocumentRepository.get_document_by_id')
    async def test_get_document_by_id_exception(self, mock_get_document, mock_supabase):
        """Test document retrieval with database exception"""
        mock_get_document.side_effect = DocumentUpdateError("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await DocumentRepository.get_document_by_id("test-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_root_documents_with_api_ref_true(self, mock_supabase):
        """Test getting root documents filtered by API reference = True"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "doc-1", "title": "API Doc 1", "is_api_ref": True},
            {"id": "doc-2", "title": "API Doc 2", "is_api_ref": True}
        ]
        
        mock_query = MagicMock()
        mock_query.execute.return_value = mock_result
        mock_query.eq.return_value = mock_query
        
        mock_table = MagicMock()
        mock_table.select().is_().eq().is_().eq.return_value = mock_query
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_root_documents(is_api_ref=True)
        
        assert len(result) == 2
        assert result[0]["id"] == "doc-1"
        assert result[1]["id"] == "doc-2"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_root_documents_with_api_ref_false(self, mock_supabase):
        """Test getting root documents filtered by API reference = False"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "doc-1", "title": "Regular Doc 1", "is_api_ref": False}
        ]
        
        mock_query = MagicMock()
        mock_query.execute.return_value = mock_result
        mock_query.eq.return_value = mock_query
        
        mock_table = MagicMock()
        mock_table.select().is_().eq().is_().eq.return_value = mock_query
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_root_documents(is_api_ref=False)
        
        assert len(result) == 1
        assert result[0]["id"] == "doc-1"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_root_documents_no_filter(self, mock_supabase):
        """Test getting root documents without API reference filter"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "doc-1", "title": "Doc 1"},
            {"id": "doc-2", "title": "Doc 2"}
        ]
        
        mock_query = MagicMock()
        mock_query.execute.return_value = mock_result
        
        mock_table = MagicMock()
        mock_table.select().is_().eq().is_.return_value = mock_query
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_root_documents(is_api_ref=None)
        
        assert len(result) == 2
        assert result[0]["id"] == "doc-1"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_root_documents_exception(self, mock_supabase):
        """Test get_root_documents with database exception"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await DocumentRepository.get_root_documents()
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_child_documents_success(self, mock_supabase):
        """Test getting child documents"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "child-1", "parent_id": "parent-id", "title": "Child 1"},
            {"id": "child-2", "parent_id": "parent-id", "title": "Child 2"}
        ]
        
        mock_table = MagicMock()
        mock_table.select().eq().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_child_documents("parent-id")
        
        assert len(result) == 2
        assert result[0]["id"] == "child-1"
        assert result[1]["id"] == "child-2"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_child_documents_exception(self, mock_supabase):
        """Test get_child_documents with database exception"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await DocumentRepository.get_child_documents("parent-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.DocumentRepository.get_document_by_id')
    async def test_get_document_parents_success(self, mock_get_doc):
        """Test getting document parents (lineage)"""
        # Mock the chain: child -> parent -> grandparent
        mock_get_doc.side_effect = [
            {"id": "child-id", "parent_id": "parent-id"},  # Child document
            {"id": "parent-id", "parent_id": "grandparent-id"},  # Parent document
            {"id": "grandparent-id", "parent_id": None}  # Grandparent document
        ]
        
        result = await DocumentRepository.get_document_parents("child-id")
        
        assert len(result) == 2  # parent and grandparent
        assert result[0]["id"] == "parent-id"
        assert result[1]["id"] == "grandparent-id"
        assert mock_get_doc.call_count == 3
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.DocumentRepository.get_document_by_id')
    async def test_get_document_parents_no_parents(self, mock_get_doc):
        """Test getting document parents when document has no parent"""
        mock_get_doc.return_value = {"id": "root-id", "parent_id": None}
        
        result = await DocumentRepository.get_document_parents("root-id")
        
        assert len(result) == 0
        assert mock_get_doc.call_count == 1
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.DocumentRepository.get_document_by_id')
    async def test_get_document_parents_document_not_found(self, mock_get_doc):
        """Test get_document_parents when document not found"""
        mock_get_doc.side_effect = DocumentNotFoundError("test-id")
        
        with pytest.raises(DocumentNotFoundError):
            await DocumentRepository.get_document_parents("test-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_all_documents_no_filters(self, mock_supabase):
        """Test getting all documents without filters"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "doc-1", "title": "Document 1"},
            {"id": "doc-2", "title": "Document 2"}
        ]
        
        mock_query = MagicMock()
        mock_query.execute.return_value = mock_result
        
        mock_table = MagicMock()
        mock_table.select().eq.return_value = mock_query
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_all_documents()
        
        assert len(result) == 2
        assert result[0]["id"] == "doc-1"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_get_all_documents_with_filters(self, mock_supabase):
        """Test getting all documents with filters"""
        mock_result = MagicMock()
        mock_result.data = [{"id": "api-doc-1", "is_api_ref": True}]
        
        mock_query = MagicMock()
        mock_query.execute.return_value = mock_result
        mock_query.eq.return_value = mock_query
        
        mock_table = MagicMock()
        mock_table.select().eq.return_value = mock_query
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.get_all_documents(
            is_deleted=False, 
            is_api_ref=True, 
            parent_id="parent-123"
        )
        
        assert len(result) == 1
        assert result[0]["id"] == "api-doc-1"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_update_document_success(self, mock_supabase):
        """Test successful document update"""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "test-id",
            "title": "Updated Title",
            "updated_at": "2023-01-01T00:00:00Z"
        }]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_eq = MagicMock()
        mock_eq.execute = mock_execute
        mock_update = MagicMock()
        mock_update.eq.return_value = mock_eq
        mock_table = MagicMock()
        mock_table.update.return_value = mock_update
        mock_supabase.table.return_value = mock_table
        
        update_data = {"title": "Updated Title"}
        result = await DocumentRepository.update_document("test-id", update_data)
        
        assert result["id"] == "test-id"
        assert result["title"] == "Updated Title"
        mock_table.update.assert_called_once_with(update_data)
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_update_document_not_found(self, mock_supabase):
        """Test document update when document not found"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.update().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentNotFoundError):
            await DocumentRepository.update_document("nonexistent-id", {"title": "New Title"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_update_current_version_success(self, mock_supabase):
        """Test successful current version update"""
        mock_result = MagicMock()
        mock_result.data = [{"id": "test-id", "current_version_id": "version-123"}]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_eq = MagicMock()
        mock_eq.execute = mock_execute
        mock_update = MagicMock()
        mock_update.eq.return_value = mock_eq
        mock_table = MagicMock()
        mock_table.update.return_value = mock_update
        mock_supabase.table.return_value = mock_table
        
        await DocumentRepository.update_current_version("test-id", "version-123")
        
        mock_table.update.assert_called_once_with({"current_version_id": "version-123"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_update_current_version_not_found(self, mock_supabase):
        """Test update current version when document not found"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.update().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentNotFoundError):
            await DocumentRepository.update_current_version("nonexistent-id", "version-123")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_delete_document_success(self, mock_supabase):
        """Test successful document deletion (soft delete)"""
        mock_result = MagicMock()
        mock_result.data = [{"id": "test-id", "is_deleted": True}]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_eq = MagicMock()
        mock_eq.execute = mock_execute
        mock_update = MagicMock()
        mock_update.eq.return_value = mock_eq
        mock_table = MagicMock()
        mock_table.update.return_value = mock_update
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.delete_document("test-id")
        
        assert result is True
        mock_table.update.assert_called_once_with({"is_deleted": True})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_delete_document_not_found(self, mock_supabase):
        """Test document deletion when document not found"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.update().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        result = await DocumentRepository.delete_document("nonexistent-id")
        
        assert result is False
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.document_repository.supabase')
    async def test_delete_document_exception(self, mock_supabase):
        """Test document deletion with database exception"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await DocumentRepository.delete_document("test-id")
