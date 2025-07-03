import pytest
from fastapi import status
from unittest.mock import MagicMock, AsyncMock
import uuid

@pytest.fixture
def mock_edit_service(test_client):
    """Mock the EditService."""
    mock_service = MagicMock()
    
    # Mock edit service methods with proper async setup
    mock_service.edit_documentation = AsyncMock()
    mock_service.update_documentation = AsyncMock()
    
    # Override the dependency
    from app.main import app
    from app.api.dependencies import get_edit_service
    
    app.dependency_overrides[get_edit_service] = lambda: mock_service
    
    yield mock_service
    
    # Clean up
    app.dependency_overrides.clear()


class TestEditDocumentation:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_edit_documentation(self, test_client, mock_edit_service):
        """Test editing documentation with AI suggestions."""
        request_data = {
            "query": "Add more examples to the API documentation",
            "document_id": str(uuid.uuid4())
        }

        expected_response = {
            "edit": [
                {
                    "document_id": request_data["document_id"],
                    "changes": [
                        {
                            "old_string": "Original API documentation",
                            "new_string": "Enhanced API documentation with examples"
                        }
                    ],
                    "version": str(uuid.uuid4())
                }
            ],
            "create": [],
            "delete": []
        }
        mock_edit_service.edit_documentation.return_value = expected_response

        # Make the request
        response = await test_client.post("/api/edit/", json=request_data)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "edit" in result
        assert "create" in result
        assert "delete" in result
        assert len(result["edit"]) == 1

        # Verify service was called
        mock_edit_service.edit_documentation.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_documentation(self, test_client, mock_edit_service):
        """Test updating documentation with changes."""
        doc_id = str(uuid.uuid4())
        request_data = {
            "edit": [
                {
                    "document_id": doc_id,
                    "changes": [
                        {
                            "old_string": "Old content",
                            "new_string": "New content"
                        }
                    ],
                    "version": str(uuid.uuid4()),
                    "original_content": {
                        "markdown_content": "# Original Content",
                        "language": "en",
                        "name": "test-doc",
                        "title": "Test Document",
                        "path": "/test/path"
                    }
                }
            ],
            "create": [],
            "delete": []
        }

        expected_response = {
            "message": "Documentation updated successfully",
            "total_processed": 1,
            "successful": 1,
            "failed": 0,
            "failed_items": None,
            "errors": []
        }

        mock_edit_service.update_documentation.return_value = expected_response

        # Make the request
        response = await test_client.post("/api/edit/update_documentation", json=request_data)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result["total_processed"] == 1
        assert result["successful"] == 1
        assert result["failed"] == 0

        # Verify service was called
        mock_edit_service.update_documentation.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_edit_documentation_invalid_request(self, test_client, mock_edit_service):
        """Test edit documentation with invalid request."""
        # Missing required 'query' field
        request_data = {
            "document_id": str(uuid.uuid4())
        }

        response = await test_client.post("/api/edit/", json=request_data)

        # Should return 422 for missing required field
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_documentation_empty_items(self, test_client, mock_edit_service):
        """Test update documentation with empty request."""
        request_data = {
            "edit": [],
            "create": [],
            "delete": []
        }

        expected_response = {
            "message": "No items to process",
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "failed_items": None,
            "errors": []
        }

        mock_edit_service.update_documentation.return_value = expected_response

        response = await test_client.post("/api/edit/update_documentation", json=request_data)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result["total_processed"] == 0

        # Verify service was called
        mock_edit_service.update_documentation.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_edit_documentation_service_error(self, test_client, mock_edit_service):
        """Test edit documentation when service raises error."""
        from app.core.exceptions import ValidationError

        request_data = {
            "query": "Invalid query",
            "document_id": str(uuid.uuid4())
        }

        # Mock service to raise error
        mock_edit_service.edit_documentation.side_effect = ValidationError("query", "Invalid query format")

        response = await test_client.post("/api/edit/", json=request_data)

        # Verify error response
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = response.json()
        assert "detail" in error

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_documentation_with_failures(self, test_client, mock_edit_service):
        """Test update documentation with some failures."""
        doc1_id = str(uuid.uuid4())
        doc2_id = str(uuid.uuid4())
        
        request_data = {
            "edit": [
                {
                    "document_id": doc1_id,
                    "changes": [
                        {
                            "old_string": "Content 1",
                            "new_string": "Updated content 1"
                        }
                    ],
                    "version": str(uuid.uuid4())
                },
                {
                    "document_id": doc2_id,
                    "changes": [
                        {
                            "old_string": "Content 2", 
                            "new_string": "Updated content 2"
                        }
                    ],
                    "version": str(uuid.uuid4())
                }
            ],
            "create": [],
            "delete": []
        }

        expected_response = {
            "message": "Documentation update completed with some failures",
            "total_processed": 2,
            "successful": 1,
            "failed": 1,
            "failed_items": {
                "edit": [
                    {
                        "document_id": doc2_id,
                        "changes": [
                            {
                                "old_string": "Content 2",
                                "new_string": "Updated content 2"
                            }
                        ],
                        "version": str(uuid.uuid4())
                    }
                ],
                "create": [],
                "delete": []
            },
            "errors": [
                {
                    "error_message": "Document not found",
                    "error_type": "DocumentNotFoundError"
                }
            ]
        }

        mock_edit_service.update_documentation.return_value = expected_response

        response = await test_client.post("/api/edit/update_documentation", json=request_data)

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result["total_processed"] == 2
        assert result["successful"] == 1
        assert result["failed"] == 1
        assert result["failed_items"] is not None
        assert len(result["errors"]) == 1

        # Verify service was called
        mock_edit_service.update_documentation.assert_called_once()