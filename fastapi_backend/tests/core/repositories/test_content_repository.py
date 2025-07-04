import pytest
from unittest.mock import patch, MagicMock
from app.core.repositories.content_repository import ContentRepository
from app.core.exceptions import DocumentNotFoundError, DocumentCreationError, DocumentUpdateError


class TestContentRepository:
    """Test the ContentRepository class"""
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_create_content_success(self, mock_supabase):
        """Test successful content creation"""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "content-id",
            "document_id": "doc-id",
            "version": "1.0",
            "markdown_content": "# Test Content",
            "created_at": "2023-01-01T00:00:00Z"
        }]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_insert = MagicMock()
        mock_insert.execute = mock_execute
        mock_table = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_supabase.table.return_value = mock_table
        
        content_data = {
            "document_id": "doc-id",
            "version": "1.0",
            "markdown_content": "# Test Content"
        }
        
        result = await ContentRepository.create_content(content_data)
        
        assert result["id"] == "content-id"
        assert result["document_id"] == "doc-id"
        assert result["version"] == "1.0"
        mock_table.insert.assert_called_once_with(content_data)
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_create_content_no_data_returned(self, mock_supabase):
        """Test content creation failure when no data returned"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.insert().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentCreationError, match="Failed to create document content"):
            await ContentRepository.create_content({"document_id": "test", "version": "1.0"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_create_content_exception(self, mock_supabase):
        """Test content creation with database exception"""
        mock_supabase.table.side_effect = Exception("Database connection error")
        
        with pytest.raises(DocumentCreationError, match="Database connection error"):
            await ContentRepository.create_content({"document_id": "test", "version": "1.0"})
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_get_document_versions_success(self, mock_supabase):
        """Test successful document versions retrieval"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "v2", "document_id": "doc-id", "version": "2.0", "created_at": "2023-01-02T00:00:00Z"},
            {"id": "v1", "document_id": "doc-id", "version": "1.0", "created_at": "2023-01-01T00:00:00Z"}
        ]
        
        # Create proper mock chain
        mock_execute = MagicMock(return_value=mock_result)
        mock_order = MagicMock()
        mock_order.execute = mock_execute
        mock_eq = MagicMock()
        mock_eq.order.return_value = mock_order
        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_table = MagicMock()
        mock_table.select.return_value = mock_select
        mock_supabase.table.return_value = mock_table
        
        result = await ContentRepository.get_document_versions("doc-id")
        
        assert len(result) == 2
        assert result[0]["version"] == "2.0"  # Should be ordered by created_at desc
        assert result[1]["version"] == "1.0"
        mock_table.select.assert_called_once_with("*")
        mock_select.eq.assert_called_once_with("document_id", "doc-id")
        mock_eq.order.assert_called_once_with("created_at", desc=True)
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_get_document_versions_exception(self, mock_supabase):
        """Test get_document_versions with database exception"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await ContentRepository.get_document_versions("doc-id")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_get_document_version_success(self, mock_supabase):
        """Test successful specific version retrieval"""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "version-id",
            "document_id": "doc-id",
            "version": "1.0",
            "markdown_content": "# Version 1.0 Content"
        }]
        
        mock_table = MagicMock()
        mock_table.select().eq().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        result = await ContentRepository.get_document_version("doc-id", "1.0")
        
        assert result["id"] == "version-id"
        assert result["version"] == "1.0"
        assert result["document_id"] == "doc-id"
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_get_document_version_not_found(self, mock_supabase):
        """Test get_document_version when version not found"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.select().eq().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(DocumentNotFoundError, match="doc-id/version/1.0"):
            await ContentRepository.get_document_version("doc-id", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.supabase')
    async def test_get_document_version_exception(self, mock_supabase):
        """Test get_document_version with database exception"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await ContentRepository.get_document_version("doc-id", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.ContentRepository.get_document_version')
    async def test_get_latest_version_success(self, mock_get_version):
        """Test successful latest version retrieval"""
        mock_version_data = {
            "id": "latest-version",
            "document_id": "doc-id",
            "version": "2.0",
            "markdown_content": "# Latest Content"
        }
        mock_get_version.return_value = mock_version_data
        
        result = await ContentRepository.get_latest_version("doc-id", "2.0")
        
        assert result == mock_version_data
        mock_get_version.assert_called_once_with("doc-id", "2.0")
    
    @pytest.mark.asyncio
    async def test_get_latest_version_no_current_version(self):
        """Test get_latest_version when no current version ID provided"""
        with pytest.raises(DocumentNotFoundError, match="doc-id \\(no versions found\\)"):
            await ContentRepository.get_latest_version("doc-id", None)
    
    @pytest.mark.asyncio
    async def test_get_latest_version_empty_current_version(self):
        """Test get_latest_version when empty current version ID provided"""
        with pytest.raises(DocumentNotFoundError, match="doc-id \\(no versions found\\)"):
            await ContentRepository.get_latest_version("doc-id", "")
    
    @pytest.mark.asyncio
    @patch('app.core.repositories.content_repository.ContentRepository.get_document_version')
    async def test_get_latest_version_propagates_errors(self, mock_get_version):
        """Test that get_latest_version propagates errors from get_document_version"""
        mock_get_version.side_effect = DocumentUpdateError("Database error")
        
        with pytest.raises(DocumentUpdateError, match="Database error"):
            await ContentRepository.get_latest_version("doc-id", "1.0")
