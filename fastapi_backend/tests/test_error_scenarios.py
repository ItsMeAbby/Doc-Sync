import pytest
from fastapi import status
from unittest.mock import MagicMock, AsyncMock
import uuid
from datetime import datetime


@pytest.fixture
def mock_document_service(test_client):
    """Mock the DocumentService for error testing."""
    mock_service = MagicMock()
    
    # Mock all service methods
    mock_service.create_document = AsyncMock()
    mock_service.get_document = AsyncMock()
    mock_service.get_root_documents = AsyncMock()
    mock_service.get_all_documents = AsyncMock()
    mock_service.update_document = AsyncMock()
    mock_service.create_document_version = AsyncMock()
    mock_service.list_document_versions = AsyncMock()
    mock_service.get_document_version = AsyncMock()
    mock_service.get_child_documents = AsyncMock()
    mock_service.get_document_parents = AsyncMock()
    
    # Override the dependency
    from app.main import app
    from app.api.dependencies import get_document_service
    
    app.dependency_overrides[get_document_service] = lambda: mock_service
    
    yield mock_service
    
    # Clean up
    app.dependency_overrides.clear()


class TestErrorScenarios:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document_validation_error(self, test_client, mock_document_service):
        """Test creating document with validation errors."""
        from app.core.exceptions import ValidationError
        
        # Invalid document data (missing required field)
        request_data = {
            "document": {
                "title": "Test Document",
                # Missing required 'name' field
                "is_api_ref": False
            },
            "content": {
                "markdown_content": "# Test Document",
                "language": "en"
            }
        }
        
        # Mock service to raise validation error
        mock_document_service.create_document.side_effect = ValidationError("name", "Name is required")
        
        # Make request
        response = await test_client.post("/api/documents/", json=request_data)
        
        # Verify error response
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document_not_found(self, test_client, mock_document_service):
        """Test getting a document that doesn't exist."""
        from app.core.exceptions import DocumentNotFoundError
        
        non_existent_id = str(uuid.uuid4())
        
        # Mock service to raise not found error
        mock_document_service.get_document.side_effect = DocumentNotFoundError(non_existent_id)
        
        # Make request
        response = await test_client.get(f"/api/documents/{non_existent_id}")
        
        # Verify error response
        assert response.status_code == status.HTTP_404_NOT_FOUND
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document_version_not_found(self, test_client, mock_document_service):
        """Test creating version for non-existent document."""
        from app.core.exceptions import DocumentNotFoundError
        
        non_existent_id = str(uuid.uuid4())
        content_data = {
            "markdown_content": "# New Version",
            "language": "en"
        }
        
        # Mock service to raise not found error
        mock_document_service.create_document_version.side_effect = DocumentNotFoundError(non_existent_id)
        
        # Make request
        response = await test_client.post(f"/api/documents/{non_existent_id}/versions", json=content_data)
        
        # Verify error response
        assert response.status_code == status.HTTP_404_NOT_FOUND
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_document_not_found(self, test_client, mock_document_service):
        """Test updating a document that doesn't exist."""
        from app.core.exceptions import DocumentNotFoundError
        
        non_existent_id = str(uuid.uuid4())
        update_data = {
            "title": "Updated Title",
            "path": "/updated/path"
        }
        
        # Mock service to raise not found error
        mock_document_service.update_document.side_effect = DocumentNotFoundError(non_existent_id)
        
        # Make request
        response = await test_client.put(f"/api/documents/{non_existent_id}", json=update_data)
        
        # Verify error response
        assert response.status_code == status.HTTP_404_NOT_FOUND
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_version_not_found(self, test_client, mock_document_service):
        """Test getting a version that doesn't exist."""
        from app.core.exceptions import DocumentNotFoundError
        
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        
        # Mock service to raise not found error
        mock_document_service.get_document_version.side_effect = DocumentNotFoundError(f"{doc_id}:{version_id}")
        
        # Make request
        response = await test_client.get(f"/api/documents/{doc_id}/versions/{version_id}")
        
        # Verify error response
        assert response.status_code == status.HTTP_404_NOT_FOUND
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_invalid_uuid_format(self, test_client, mock_document_service):
        """Test endpoints with invalid UUID format."""
        invalid_uuid = "not-a-valid-uuid"
        
        # Test get document with invalid UUID
        response = await test_client.get(f"/api/documents/{invalid_uuid}")
        
        # Should return 422 for invalid UUID format
        assert response.status_code in [status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_404_NOT_FOUND]

    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document_without_content(self, test_client, mock_document_service):
        """Test creating document without content (folder-like)."""
        doc_id = str(uuid.uuid4())
        
        # Document data without content
        document_data = {
            "title": "Folder Document",
            "path": "/folder",
            "name": "folder-doc",
            "is_api_ref": False
        }
        
        expected_doc = {
            **document_data,
            "id": doc_id,
            "current_version_id": None,  # No content means no version
            "created_at": datetime.now().isoformat(),
            "is_deleted": False
        }
        
        mock_document_service.create_document.return_value = expected_doc
        
        # Create document without content
        request_data = {
            "document": document_data
            # No content field
        }
        
        response = await test_client.post("/api/documents/", json=request_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        created_doc = response.json()
        assert created_doc["current_version_id"] is None
        assert created_doc["title"] == document_data["title"]

    @pytest.mark.asyncio(loop_scope="function")
    async def test_empty_results(self, test_client, mock_document_service):
        """Test endpoints that return empty results."""
        # Test empty root documents
        mock_document_service.get_root_documents.return_value = []
        
        response = await test_client.get("/api/documents/root")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
        
        # Test empty children
        parent_id = str(uuid.uuid4())
        mock_document_service.get_child_documents.return_value = []
        
        response = await test_client.get(f"/api/documents/{parent_id}/children")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
        
        # Test empty parents
        doc_id = str(uuid.uuid4())
        mock_document_service.get_document_parents.return_value = []
        
        response = await test_client.get(f"/api/documents/{doc_id}/parents")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    @pytest.mark.asyncio(loop_scope="function")
    async def test_malformed_request_body(self, test_client, mock_document_service):
        """Test endpoints with malformed request bodies."""
        # Test create document with malformed JSON
        response = await test_client.post(
            "/api/documents/",
            json={"invalid": "structure"}
        )
        
        # Should return 422 for validation error
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_concurrent_operations(self, test_client, mock_document_service):
        """Test handling of concurrent operations (basic test)."""
        doc_id = str(uuid.uuid4())
        
        # Simulate concurrent document updates
        mock_document_service.update_document.return_value = {
            "id": doc_id,
            "title": "Updated Document",
            "path": "/updated",
            "name": "updated-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": None
        }
        
        # Make multiple concurrent requests
        import asyncio
        
        update_data = {"title": "Updated Title"}
        
        async def update_request():
            return await test_client.put(f"/api/documents/{doc_id}", json=update_data)
        
        # Run multiple requests concurrently
        responses = await asyncio.gather(
            update_request(),
            update_request(),
            update_request()
        )
        
        # All should succeed (assuming no real conflicts in mock)
        for response in responses:
            assert response.status_code == status.HTTP_200_OK