import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.shared.tools import (
    Document,
    DocumentPath,
    ToolResponse,
    DocumentListResponse,
    PathListResponse,
    DocumentDetailResponse,
    DatabaseTool,
    get_document_by_version_core,
    get_all_document_paths_core,
    search_similar_documents_core
)


class TestModels:
    """Test the Pydantic models"""
    
    def test_document_model_creation(self):
        """Test Document model creation with all fields"""
        doc = Document(
            id="test-id",
            title="Test Document",
            version="1.0",
            markdown_content="# Test",
            summary="Test summary",
            similarity=0.95,
            path="/test/path",
            name="test.md",
            language="en",
            keywords_array=["test", "document"],
            urls_array=["http://example.com"],
            is_api_ref=True
        )
        assert doc.id == "test-id"
        assert doc.title == "Test Document"
        assert doc.is_api_ref is True
        assert doc.keywords_array == ["test", "document"]
    
    def test_document_model_minimal(self):
        """Test Document model with minimal required fields"""
        doc = Document(id="test-id")
        assert doc.id == "test-id"
        assert doc.title is None
        assert doc.is_api_ref is False
        assert doc.keywords_array is None
    
    def test_document_path_model(self):
        """Test DocumentPath model"""
        path = DocumentPath(
            id="test-id",
            path="/test/path",
            name="test.md",
            title="Test Title"
        )
        assert path.id == "test-id"
        assert path.path == "/test/path"
        assert path.name == "test.md"
        assert path.title == "Test Title"
    
    def test_tool_response_models(self):
        """Test response models"""
        # Base response
        response = ToolResponse(success=True, message="Success", data={"key": "value"})
        assert response.success is True
        assert response.message == "Success"
        assert response.data == {"key": "value"}
        
        # Document list response
        doc_response = DocumentListResponse(
            success=True,
            documents=[Document(id="test")]
        )
        assert doc_response.success is True
        assert len(doc_response.documents) == 1
        
        # Path list response
        path_response = PathListResponse(
            success=True,
            paths=[DocumentPath(id="test", path="/test", name="test")]
        )
        assert path_response.success is True
        assert len(path_response.paths) == 1
        
        # Document detail response
        detail_response = DocumentDetailResponse(
            success=True,
            document=Document(id="test")
        )
        assert detail_response.success is True
        assert detail_response.document.id == "test"


class TestDatabaseTool:
    """Test the DatabaseTool class"""
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.supabase')
    async def test_get_document_by_version_success(self, mock_supabase):
        """Test successful document retrieval by version"""
        # Mock document metadata response
        mock_doc_result = MagicMock()
        mock_doc_result.data = [{
            "id": "test-id",
            "title": "Test Document",
            "path": "/test/path",
            "name": "test.md",
            "is_api_ref": False
        }]
        
        # Mock content response
        mock_content_result = MagicMock()
        mock_content_result.data = [{
            "markdown_content": "# Test Content",
            "summary": "Test summary",
            "language": "en",
            "keywords_array": ["test"],
            "urls_array": ["http://example.com"]
        }]
        
        # Configure mock chain
        mock_table = MagicMock()
        mock_table.select().eq().execute.return_value = mock_doc_result
        mock_supabase.table.side_effect = [mock_table, mock_table]
        
        # Second call for content
        mock_table2 = MagicMock()
        mock_table2.select().eq().eq().execute.return_value = mock_content_result
        mock_supabase.table.side_effect = [mock_table, mock_table2]
        
        result = await DatabaseTool.get_document_by_version("test-id", "1.0")
        
        assert isinstance(result, Document)
        assert result.id == "test-id"
        assert result.title == "Test Document"
        assert result.version == "1.0"
        assert result.markdown_content == "# Test Content"
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.supabase')
    async def test_get_document_by_version_not_found(self, mock_supabase):
        """Test document not found error"""
        mock_result = MagicMock()
        mock_result.data = []
        
        mock_table = MagicMock()
        mock_table.select().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        with pytest.raises(ValueError, match="Document test-id not found"):
            await DatabaseTool.get_document_by_version("test-id", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.supabase')
    async def test_get_document_by_version_content_not_found(self, mock_supabase):
        """Test version not found error"""
        # Mock document found but content not found
        mock_doc_result = MagicMock()
        mock_doc_result.data = [{"id": "test-id", "title": "Test"}]
        
        mock_content_result = MagicMock()
        mock_content_result.data = []
        
        mock_table = MagicMock()
        mock_supabase.table.side_effect = [mock_table, mock_table]
        mock_table.select().eq().execute.return_value = mock_doc_result
        mock_table.select().eq().eq().execute.return_value = mock_content_result
        
        with pytest.raises(ValueError, match="Version 1.0 not found for document test-id"):
            await DatabaseTool.get_document_by_version("test-id", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.supabase')
    async def test_get_all_document_paths_success(self, mock_supabase):
        """Test successful retrieval of document paths"""
        mock_result = MagicMock()
        mock_result.data = [
            {"id": "test-1", "path": "/test/path1", "name": "test1.md", "title": "Test 1"},
            {"id": "test-2", "path": "/test/path2", "name": "test2.md", "title": "Test 2"}
        ]
        
        mock_table = MagicMock()
        mock_table.select().eq().eq().execute.return_value = mock_result
        mock_supabase.table.return_value = mock_table
        
        result = await DatabaseTool.get_all_document_paths(is_api_ref=False)
        
        assert len(result) == 2
        assert all(isinstance(path, DocumentPath) for path in result)
        assert result[0].id == "test-1"
        assert result[0].path == "/test/path1"
        assert result[1].id == "test-2"
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.supabase')
    async def test_get_all_document_paths_error(self, mock_supabase):
        """Test error handling in get_all_document_paths"""
        mock_supabase.table.side_effect = Exception("Database error")
        
        with pytest.raises(ValueError, match="Error fetching document paths: Database error"):
            await DatabaseTool.get_all_document_paths()
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.create_embedding')
    @patch('app.services.shared.tools.supabase')
    async def test_search_similar_documents_success(self, mock_supabase, mock_create_embedding):
        """Test successful similarity search"""
        mock_create_embedding.return_value = [0.1, 0.2, 0.3]
        
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": "test-1",
                "title": "Similar Doc 1",
                "version": "1.0",
                "markdown_content": "Content 1",
                "summary": "Summary 1",
                "similarity": 0.85,
                "path": "/test/path1",
                "name": "test1.md",
                "language": "en",
                "keywords_array": ["test"],
                "urls_array": ["http://example.com"],
                "is_api_ref": False
            }
        ]
        
        mock_supabase.rpc.return_value.execute.return_value = mock_result
        
        result = await DatabaseTool.search_similar_documents("test query", limit=5)
        
        assert len(result) == 1
        assert isinstance(result[0], Document)
        assert result[0].id == "test-1"
        assert result[0].similarity == 0.85
        
        mock_create_embedding.assert_called_once_with("test query")
        mock_supabase.rpc.assert_called_once_with(
            "search_documents",
            {
                "query_embedding": [0.1, 0.2, 0.3],
                "match_threshold": 0.78,
                "match_count": 5
            }
        )
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.create_embedding')
    async def test_search_similar_documents_embedding_error(self, mock_create_embedding):
        """Test error in embedding creation"""
        mock_create_embedding.side_effect = Exception("Embedding error")
        
        with pytest.raises(ValueError, match="Error searching documents: Embedding error"):
            await DatabaseTool.search_similar_documents("test query")


class TestFunctionTools:
    """Test the function tool decorators"""
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.get_document_by_version')
    async def test_get_document_by_version_tool_success(self, mock_db_tool):
        """Test get_document_by_version function tool success"""
        mock_document = Document(id="test-id", title="Test Document")
        mock_db_tool.return_value = mock_document
        
        result = await get_document_by_version_core("test-id", "1.0")
        
        assert isinstance(result, DocumentDetailResponse)
        assert result.success is True
        assert result.message == "Document retrieved successfully"
        assert result.document.id == "test-id"
        
        mock_db_tool.assert_called_once_with("test-id", "1.0")
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.get_document_by_version')
    async def test_get_document_by_version_tool_error(self, mock_db_tool):
        """Test get_document_by_version function tool error"""
        mock_db_tool.side_effect = Exception("Database error")
        
        result = await get_document_by_version_core("test-id", "1.0")
        
        assert isinstance(result, DocumentDetailResponse)
        assert result.success is False
        assert result.message == "Database error"
        assert result.document is None
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.get_all_document_paths')
    async def test_get_all_document_paths_tool_success(self, mock_db_tool):
        """Test get_all_document_paths function tool success"""
        mock_paths = [
            DocumentPath(id="test-1", path="/test/path1", name="test1.md"),
            DocumentPath(id="test-2", path="/test/path2", name="test2.md")
        ]
        mock_db_tool.return_value = mock_paths
        
        result = await get_all_document_paths_core(is_api_ref=True)
        
        assert isinstance(result, PathListResponse)
        assert result.success is True
        assert result.message == "Found 2 document paths"
        assert len(result.paths) == 2
        
        mock_db_tool.assert_called_once_with(True)
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.get_all_document_paths')
    async def test_get_all_document_paths_tool_error(self, mock_db_tool):
        """Test get_all_document_paths function tool error"""
        mock_db_tool.side_effect = Exception("Database error")
        
        result = await get_all_document_paths_core()
        
        assert isinstance(result, PathListResponse)
        assert result.success is False
        assert result.message == "Database error"
        assert result.paths == []
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.search_similar_documents')
    async def test_search_similar_documents_tool_success(self, mock_db_tool):
        """Test search_similar_documents function tool success"""
        mock_documents = [
            Document(id="test-1", title="Similar Doc 1"),
            Document(id="test-2", title="Similar Doc 2")
        ]
        mock_db_tool.return_value = mock_documents
        
        result = await search_similar_documents_core("test query", limit=5)
        
        assert isinstance(result, DocumentListResponse)
        assert result.success is True
        assert result.message == "Found 2 similar documents"
        assert len(result.documents) == 2
        
        mock_db_tool.assert_called_once_with("test query", 5)
    
    @pytest.mark.asyncio
    @patch('app.services.shared.tools.DatabaseTool.search_similar_documents')
    async def test_search_similar_documents_tool_error(self, mock_db_tool):
        """Test search_similar_documents function tool error"""
        mock_db_tool.side_effect = Exception("Search error")
        
        result = await search_similar_documents_core("test query")
        
        assert isinstance(result, DocumentListResponse)
        assert result.success is False
        assert result.message == "Search error"
        assert result.documents == []
