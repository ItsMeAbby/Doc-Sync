import pytest
from fastapi import status
import uuid
from unittest.mock import patch, AsyncMock, MagicMock
import json
from datetime import datetime


@pytest.fixture
def mock_process_document_content():
    """Mock the process_document_content function."""
    with patch('app.routes.documents.process_document_content') as mock:
        # Set up the mock to return a dictionary with the expected fields
        mock.return_value = {
            "language": "en",
            "keywords_array": ["test", "document", "api"],
            "urls_array": ["https://example.com"],
            "summary": "This is a test document summary.",
            "embedding": [0.1] * 1536  # Mock embedding vector
        }
        # Make it work with async
        mock.side_effect = AsyncMock(return_value=mock.return_value)
        yield mock
        
        
@pytest.fixture
def mock_supabase():
    """Mock the Supabase client."""
    with patch('app.routes.documents.supabase') as mock_supabase:
        # Create a document ID that we'll use consistently
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        
        # Set up mock for document creation
        mock_insert = MagicMock()
        mock_insert.execute.return_value.data = [{
            "id": doc_id,
            "title": "Test Document",
            "path": "/test/path",
            "name": "test-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": None
        }]
        
        # Set up mock for content creation
        mock_content_insert = MagicMock()
        mock_content_insert.execute.return_value.data = [{
            "version": version_id,
            "document_id": doc_id,
            "markdown_content": "# Test Document\nThis is a test document.",
            "language": "en",
            "keywords_array": ["test", "document", "api"],
            "urls_array": ["https://example.com"],
            "summary": "This is a test document summary.",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }]
        
        # Set up mock for document update
        mock_update = MagicMock()
        mock_update.eq.return_value.execute.return_value.data = [{
            "id": doc_id,
            "title": "Updated Title",
            "path": "/updated/path",
            "name": "updated-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": version_id
        }]
        
        # Set up mock for document select
        mock_select = MagicMock()
        mock_select.eq.return_value.execute.return_value.data = [{
            "id": doc_id,
            "title": "Test Document",
            "path": "/test/path",
            "name": "test-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": version_id
        }]
        
        # Set up mock for versions select
        mock_versions_select = MagicMock()
        mock_versions_select.eq.return_value.order.return_value.execute.return_value.data = [
            {
                "version": version_id,
                "document_id": doc_id,
                "markdown_content": "# Test Document\nThis is a test document.",
                "language": "en",
                "keywords_array": ["test", "document", "api"],
                "urls_array": ["https://example.com"],
                "summary": "This is a test document summary.",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "version": str(uuid.uuid4()),
                "document_id": doc_id,
                "markdown_content": "# Old Version\nThis is an older version.",
                "language": "en",
                "keywords_array": ["old", "version"],
                "urls_array": [],
                "summary": "An older version.",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        
        # Set up mock for latest version select
        mock_latest_select = MagicMock()
        mock_latest_select.eq.return_value.eq.return_value.execute.return_value.data = [
            {
                "version": version_id,
                "document_id": doc_id,
                "markdown_content": "# Test Document\nThis is a test document.",
                "language": "en",
                "keywords_array": ["test", "document", "api"],
                "urls_array": ["https://example.com"],
                "summary": "This is a test document summary.",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        
        # Set up mock for versions limit
        mock_versions_limit = MagicMock()
        mock_versions_limit.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {
                "version": version_id,
                "document_id": doc_id,
                "markdown_content": "# Test Document\nThis is a test document.",
                "language": "en",
                "keywords_array": ["test", "document", "api"],
                "urls_array": ["https://example.com"],
                "summary": "This is a test document summary.",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "version": str(uuid.uuid4()),
                "document_id": doc_id,
                "markdown_content": "# Old Version\nThis is an older version.",
                "language": "en",
                "keywords_array": ["old", "version"],
                "urls_array": [],
                "summary": "An older version.",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        
        # Set up mock for root documents
        mock_root_select = MagicMock()
        mock_root_select.is_.return_value.eq.return_value.execute.return_value.data = [
            {
                "id": doc_id,
                "title": "Test Document",
                "path": "/test/path",
                "name": "test-doc",
                "is_api_ref": False,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": version_id
            }
        ]
        
        # Set up mock for API refs
        mock_refs_select = MagicMock()
        mock_refs_select.eq.return_value.eq.return_value.execute.return_value.data = [
            {
                "id": doc_id,
                "title": "Test Document",
                "path": "/test/path",
                "name": "test-doc",
                "is_api_ref": True,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": version_id
            }
        ]
        
        # Configure mock_supabase.table to return different mocks based on the method chain
        def mock_table_side_effect(table_name):
            mock_table = MagicMock()
            
            if table_name == "documents":
                # Insert operation
                mock_table.insert.return_value = mock_insert
                
                # Select operations
                mock_table.select.return_value = mock_select
                
                # Update operation
                mock_table.update.return_value = mock_update
                
                # For root documents
                mock_table.select.return_value.is_ = lambda field, value: mock_root_select
                
                # For API refs
                mock_table.select.return_value.eq = lambda field, value: (
                    mock_refs_select if field == "is_api_ref" else mock_select
                )
            
            elif table_name == "document_contents":
                # Insert operation
                mock_table.insert.return_value = mock_content_insert
                
                # Select operations for versions
                mock_table.select.return_value = mock_versions_select
                
                # For latest version
                mock_table.select.return_value.eq = lambda field, value: mock_latest_select
                
                # For previous version
                mock_table.select.return_value.eq.return_value.order = lambda field, desc: mock_versions_limit
            
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_side_effect
        
        # Store the IDs for reference in tests
        mock_supabase.test_doc_id = doc_id
        mock_supabase.test_version_id = version_id
        
        yield mock_supabase


class TestDocuments:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document(self, test_client, mock_process_document_content, mock_supabase):
        """Test creating a document with its first version."""
        # Document data
        document_data = {
            "title": "Test Document",
            "path": "/test/path",
            "name": "test-doc",
            "is_api_ref": False
        }
        
        # Content data
        content_data = {
            "markdown_content": "# Test Document\nThis is a test document."
        }
        
        # Combine both for the API call
        request_data = {
            "document": document_data,
            "content": content_data
        }
        
        # Create document
        response = await test_client.post("/documents/", json=request_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        created_doc = response.json()
        assert created_doc["title"] == document_data["title"]
        assert created_doc["path"] == document_data["path"]
        assert created_doc["name"] == document_data["name"]
        assert "id" in created_doc
        assert "current_version_id" in created_doc
        
        # Verify mock was called
        mock_process_document_content.assert_called_once_with(
            content_data["markdown_content"], 
            None  # language is not provided in the test
        )
        
        # Return the document ID from our mock
        return mock_supabase.test_doc_id
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document(self, test_client, mock_process_document_content, mock_supabase):
        """Test retrieving a document."""
        # Use document ID from mock
        doc_id = mock_supabase.test_doc_id
        
        # Get the document
        response = await test_client.get(f"/documents/{doc_id}")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        doc = response.json()
        assert doc["id"] == doc_id
        assert "title" in doc
        assert "path" in doc
        assert "name" in doc
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document_version(self, test_client, mock_process_document_content, mock_supabase):
        """Test creating a new version for an existing document."""
        # Use document ID from mock
        doc_id = mock_supabase.test_doc_id
        
        # Create new version
        content_data = {
            "markdown_content": "# Updated Document\nThis is an updated version of the test document."
        }
        
        response = await test_client.post(f"/documents/{doc_id}/versions", json=content_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert "version" in version
        assert version["markdown_content"] == content_data["markdown_content"]
        
        # Verify mock was called
        mock_process_document_content.assert_called_with(
            content_data["markdown_content"], 
            None  # language is not provided in the test
        )
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document_versions(self, test_client, mock_supabase):
        """Test retrieving all versions of a document."""
        # Use document ID from mock
        doc_id = mock_supabase.test_doc_id
        
        # Get all versions
        response = await test_client.get(f"/documents/{doc_id}/versions")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        versions = response.json()
        assert len(versions) >= 2  # Should have at least 2 versions
        assert all(v["document_id"] == doc_id for v in versions)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_latest_version(self, test_client, mock_supabase):
        """Test retrieving the latest version of a document."""
        # Use document ID and version ID from mock
        doc_id = mock_supabase.test_doc_id
        version_id = mock_supabase.test_version_id
        
        # Get latest version
        response = await test_client.get(f"/documents/{doc_id}/versions/latest")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert version["version"] == version_id
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_previous_version(self, test_client, mock_supabase):
        """Test retrieving the previous (second-latest) version of a document."""
        # Use document ID from mock
        doc_id = mock_supabase.test_doc_id
        
        # Get previous version
        response = await test_client.get(f"/documents/{doc_id}/versions/previous")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert "version" in version
        assert "markdown_content" in version
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_document(self, test_client, mock_supabase):
        """Test updating a document's metadata."""
        # Use document ID from mock
        doc_id = mock_supabase.test_doc_id
        
        # Update document
        update_data = {
            "title": "Updated Title",
            "path": "/updated/path",
            "name": "updated-doc"
        }
        
        response = await test_client.put(f"/documents/{doc_id}", json=update_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        updated_doc = response.json()
        assert updated_doc["id"] == doc_id
        assert updated_doc["title"] == update_data["title"]
        assert updated_doc["path"] == update_data["path"]
        assert updated_doc["name"] == update_data["name"]
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_nonexistent_document(self, test_client, mock_supabase):
        """Test getting a document that doesn't exist."""
        # Mock a 404 response for a non-existent document
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        random_id = str(uuid.uuid4())
        response = await test_client.get(f"/documents/{random_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_root_documents(self, test_client, mock_supabase):
        """Test getting root-level documents (no parent)."""
        # Get root documents
        response = await test_client.get("/documents/root")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        root_docs = response.json()
        assert isinstance(root_docs, list)
        # Should contain at least one document
        assert len(root_docs) >= 1
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_api_refs(self, test_client, mock_supabase):
        """Test getting API reference documents."""
        # Get API references
        response = await test_client.get("/documents/refs")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        api_refs = response.json()
        assert isinstance(api_refs, list)
        assert len(api_refs) >= 1
        assert all(doc["is_api_ref"] for doc in api_refs)