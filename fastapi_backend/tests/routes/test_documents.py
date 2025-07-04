import pytest
from fastapi import status
import uuid
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime


@pytest.fixture
def mock_document_service(test_client):
    """Mock the DocumentService."""
    mock_service = MagicMock()
    
    # Mock document service methods with proper async setup
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




class TestDocuments:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document(self, test_client, mock_document_service):
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
            "markdown_content": "# Test Document\nThis is a test document.",
            "language": "en"
        }
        
        # Setup mock response
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        expected_doc = {
            **document_data,
            "id": doc_id,
            "current_version_id": version_id,
            "created_at": datetime.now().isoformat(),
            "is_deleted": False
        }
        mock_document_service.create_document.return_value = expected_doc
        
        # Create document - send as separate body parameters
        request_data = {
            "document": document_data,
            "content": content_data
        }
        response = await test_client.post("/api/documents/", json=request_data)
        
        # Verify response
        if response.status_code == 422:
            print(f"Validation Error: {response.json()}")
        assert response.status_code == status.HTTP_200_OK
        created_doc = response.json()
        assert created_doc["title"] == document_data["title"]
        assert created_doc["path"] == document_data["path"]
        assert created_doc["name"] == document_data["name"]
        assert created_doc["id"] == doc_id
        assert created_doc["current_version_id"] == version_id
        
        # Verify service was called with correct parameters
        mock_document_service.create_document.assert_called_once()
        call_args = mock_document_service.create_document.call_args
        
        # Check that the document data was passed correctly
        doc_arg = call_args[0][0]  # First positional argument
        assert doc_arg.title == document_data["title"]
        assert doc_arg.path == document_data["path"]
        assert doc_arg.name == document_data["name"]
        
        # Check that the content data was passed correctly
        content_arg = call_args[0][1]  # Second positional argument
        assert content_arg.markdown_content == content_data["markdown_content"]
        assert content_arg.language == content_data["language"]
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document(self, test_client, mock_document_service):
        """Test retrieving a document."""
        doc_id = str(uuid.uuid4())
        expected_doc = {
            "id": doc_id,
            "title": "Test Document",
            "path": "/test/path", 
            "name": "test-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": str(uuid.uuid4())
        }
        mock_document_service.get_document.return_value = expected_doc
        
        # Get the document
        response = await test_client.get(f"/api/documents/{doc_id}")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        doc = response.json()
        assert doc["id"] == doc_id
        assert doc["title"] == expected_doc["title"]
        assert doc["path"] == expected_doc["path"]
        assert doc["name"] == expected_doc["name"]
        
        # Verify service was called
        mock_document_service.get_document.assert_called_once_with(doc_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_document_version(self, test_client, mock_document_service):
        """Test creating a new version for an existing document."""
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        
        content_data = {
            "markdown_content": "# Updated Document\nThis is an updated version of the test document."
        }
        
        expected_version = {
            "document_id": doc_id,
            "version": version_id,
            "markdown_content": content_data["markdown_content"],
            "language": "en",
            "keywords_array": ["updated", "document"],
            "summary": "Updated document summary",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        mock_document_service.create_document_version.return_value = expected_version
        
        response = await test_client.post(f"/api/documents/{doc_id}/versions", json=content_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert version["version"] == version_id
        assert version["markdown_content"] == content_data["markdown_content"]
        
        # Verify service was called
        mock_document_service.create_document_version.assert_called_once()
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document_versions(self, test_client, mock_document_service):
        """Test retrieving all versions of a document."""
        doc_id = str(uuid.uuid4())
        expected_versions = [
            {
                "document_id": doc_id,
                "version": str(uuid.uuid4()),
                "markdown_content": "# Test Document v1",
                "language": "en",
                "keywords_array": ["test", "document"],
                "summary": "Test document v1 summary",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "document_id": doc_id,
                "version": str(uuid.uuid4()),
                "markdown_content": "# Test Document v2",
                "language": "en",
                "keywords_array": ["test", "document", "v2"],
                "summary": "Test document v2 summary",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        mock_document_service.list_document_versions.return_value = expected_versions
        
        # Get all versions
        response = await test_client.get(f"/api/documents/{doc_id}/versions")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        versions = response.json()
        assert len(versions) == 2
        assert all(v["document_id"] == doc_id for v in versions)
        
        # Verify service was called
        mock_document_service.list_document_versions.assert_called_once_with(doc_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_latest_version(self, test_client, mock_document_service):
        """Test retrieving the latest version of a document."""
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        
        expected_version = {
            "document_id": doc_id,
            "version": version_id,
            "markdown_content": "# Latest Version",
            "language": "en",
            "keywords_array": ["latest", "version"],
            "summary": "Latest version summary",
            "name": "test-doc",
            "title": "Test Document",
            "path": "/test/path",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        mock_document_service.get_document_version.return_value = expected_version
        
        # Get latest version
        response = await test_client.get(f"/api/documents/{doc_id}/versions/latest")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert version["version"] == version_id
        
        # Verify service was called
        mock_document_service.get_document_version.assert_called_once_with(doc_id, "latest")
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_previous_version(self, test_client, mock_document_service):
        """Test retrieving a specific version of a document."""
        doc_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        
        expected_version = {
            "document_id": doc_id,
            "version": version_id,
            "markdown_content": "# Previous Version",
            "language": "en",
            "keywords_array": ["previous", "version"],
            "summary": "Previous version summary",
            "name": "test-doc",
            "title": "Test Document",
            "path": "/test/path",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        mock_document_service.get_document_version.return_value = expected_version
        
        # Get specific version
        response = await test_client.get(f"/api/documents/{doc_id}/versions/{version_id}")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        version = response.json()
        assert version["document_id"] == doc_id
        assert version["version"] == version_id
        assert "markdown_content" in version
        
        # Verify service was called
        mock_document_service.get_document_version.assert_called_once_with(doc_id, version_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_document(self, test_client, mock_document_service):
        """Test updating a document's metadata."""
        doc_id = str(uuid.uuid4())
        
        update_data = {
            "title": "Updated Title",
            "path": "/updated/path",
            "name": "updated-doc"
        }
        
        expected_updated_doc = {
            "id": doc_id,
            "title": "Updated Title",
            "path": "/updated/path",
            "name": "updated-doc",
            "is_api_ref": False,
            "parent_id": None,
            "is_deleted": False,
            "created_at": datetime.now().isoformat(),
            "current_version_id": str(uuid.uuid4())
        }
        mock_document_service.update_document.return_value = expected_updated_doc
        
        response = await test_client.put(f"/api/documents/{doc_id}", json=update_data)
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        updated_doc = response.json()
        assert updated_doc["id"] == doc_id
        assert updated_doc["title"] == update_data["title"]
        assert updated_doc["path"] == update_data["path"]
        assert updated_doc["name"] == update_data["name"]
        
        # Verify service was called
        mock_document_service.update_document.assert_called_once()
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_nonexistent_document(self, test_client, mock_document_service):
        """Test getting a document that doesn't exist."""
        from app.core.exceptions import DocumentNotFoundError
        
        # Mock service to raise DocumentNotFoundError
        random_id = str(uuid.uuid4())
        mock_document_service.get_document.side_effect = DocumentNotFoundError(random_id)
        
        response = await test_client.get(f"/api/documents/{random_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Verify service was called
        mock_document_service.get_document.assert_called_once_with(random_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_root_documents(self, test_client, mock_document_service):
        """Test getting root-level documents (no parent)."""
        expected_root_docs = [
            {
                "id": str(uuid.uuid4()),
                "title": "Root Document 1",
                "path": "/root1",
                "name": "root-doc-1",
                "is_api_ref": True,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_root_documents.return_value = expected_root_docs
        
        # Get root documents
        response = await test_client.get("/api/documents/root")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        root_docs = response.json()
        assert isinstance(root_docs, list)
        assert len(root_docs) == 1
        assert root_docs[0]["title"] == "Root Document 1"
        
        # Verify service was called
        mock_document_service.get_root_documents.assert_called_once_with(None)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_child_documents(self, test_client, mock_document_service):
        """Test getting child documents of a parent."""
        parent_id = str(uuid.uuid4())
        expected_children = [
            {
                "id": str(uuid.uuid4()),
                "title": "Child Document 1",
                "path": "/parent/child1",
                "name": "child-doc-1",
                "is_api_ref": False,
                "parent_id": parent_id,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Child Document 2", 
                "path": "/parent/child2",
                "name": "child-doc-2",
                "is_api_ref": False,
                "parent_id": parent_id,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_child_documents.return_value = expected_children
        
        # Get child documents
        response = await test_client.get(f"/api/documents/{parent_id}/children")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        children = response.json()
        assert isinstance(children, list)
        assert len(children) == 2
        assert all(child["parent_id"] == parent_id for child in children)
        
        # Verify service was called
        mock_document_service.get_child_documents.assert_called_once_with(parent_id)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document_parents(self, test_client, mock_document_service):
        """Test getting parent hierarchy of a document."""
        doc_id = str(uuid.uuid4())
        parent_id = str(uuid.uuid4())
        grandparent_id = str(uuid.uuid4())
        
        expected_parents = [
            {
                "id": grandparent_id,
                "title": "Grandparent Document",
                "path": "/grandparent",
                "name": "grandparent-doc",
                "is_api_ref": False,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            },
            {
                "id": parent_id,
                "title": "Parent Document",
                "path": "/grandparent/parent",
                "name": "parent-doc",
                "is_api_ref": False,
                "parent_id": grandparent_id,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_document_parents.return_value = expected_parents
        
        # Get parent documents
        response = await test_client.get(f"/api/documents/{doc_id}/parents")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        parents = response.json()
        assert isinstance(parents, list)
        assert len(parents) == 2
        
        # Verify service was called
        mock_document_service.get_document_parents.assert_called_once_with(doc_id)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_all_documents(self, test_client, mock_document_service):
        """Test getting all documents with filters."""
        expected_response = {
            "documentation": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Documentation Doc",
                    "path": "/docs/doc1",
                    "name": "doc1",
                    "is_api_ref": False,
                    "parent_id": None,
                    "is_deleted": False,
                    "created_at": datetime.now().isoformat(),
                    "current_version_id": None,
                    "markdown_content": "# Documentation",
                    "language": "en",
                    "keywords_array": ["doc", "test"],
                    "children": []
                }
            ],
            "api_references": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "API Reference Doc",
                    "path": "/api/ref1",
                    "name": "api-ref1",
                    "is_api_ref": True,
                    "parent_id": None,
                    "is_deleted": False,
                    "created_at": datetime.now().isoformat(),
                    "current_version_id": None,
                    "markdown_content": "# API Reference",
                    "language": "en",
                    "keywords_array": ["api", "reference"],
                    "children": []
                }
            ]
        }
        mock_document_service.get_all_documents.return_value = expected_response
        
        # Get all documents
        response = await test_client.get("/api/documents/")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        all_docs = response.json()
        assert "documentation" in all_docs
        assert "api_references" in all_docs
        assert len(all_docs["documentation"]) == 1
        assert len(all_docs["api_references"]) == 1
        
        # Verify service was called with default parameters
        mock_document_service.get_all_documents.assert_called_once_with(False, None, None)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_all_documents_with_filters(self, test_client, mock_document_service):
        """Test getting all documents with query parameters."""
        expected_response = {
            "en": {
                "documentation": [],
                "api_references": [
                    {
                        "id": str(uuid.uuid4()),
                        "title": "API Reference Doc",
                        "path": "/api/ref1",
                        "name": "api-ref1",
                        "is_api_ref": True,
                        "parent_id": None,
                        "is_deleted": False,
                        "created_at": datetime.now().isoformat(),
                        "current_version_id": None,
                        "markdown_content": "# API Reference",
                        "language": "en",
                        "keywords_array": ["api", "reference"],
                        "children": []
                    }
                ]
            },
            "ja": {
                "documentation": [],
                "api_references": []
            }
        }
        mock_document_service.get_all_documents.return_value = expected_response
        
        # Get all documents with filters
        response = await test_client.get("/api/documents/?is_api_ref=true&is_deleted=false")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        all_docs = response.json()
        assert "en" in all_docs
        assert "ja" in all_docs
        assert "documentation" in all_docs["en"]
        assert "api_references" in all_docs["en"]
        assert len(all_docs["en"]["documentation"]) == 0
        assert len(all_docs["en"]["api_references"]) == 1
        
        # Verify service was called with correct parameters
        mock_document_service.get_all_documents.assert_called_once_with(False, True, None)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_api_refs(self, test_client, mock_document_service):
        """Test getting API reference documents via root endpoint."""
        expected_api_refs = [
            {
                "id": str(uuid.uuid4()),
                "title": "API Reference 1",
                "path": "/api/ref1",
                "name": "api-ref-1",
                "is_api_ref": True,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_root_documents.return_value = expected_api_refs
        
        # Get API references via root endpoint with is_api_ref=true
        response = await test_client.get("/api/documents/root?is_api_ref=true")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        api_refs = response.json()
        assert isinstance(api_refs, list)
        assert len(api_refs) == 1
        assert all(doc["is_api_ref"] for doc in api_refs)
        
        # Verify service was called
        mock_document_service.get_root_documents.assert_called_once_with(True)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_child_documents(self, test_client, mock_document_service):
        """Test getting child documents of a parent."""
        parent_id = str(uuid.uuid4())
        expected_children = [
            {
                "id": str(uuid.uuid4()),
                "title": "Child Document 1",
                "path": "/parent/child1",
                "name": "child-doc-1",
                "is_api_ref": False,
                "parent_id": parent_id,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_child_documents.return_value = expected_children
        
        # Get child documents
        response = await test_client.get(f"/api/documents/{parent_id}/children")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        children = response.json()
        assert isinstance(children, list)
        assert len(children) == 1
        assert children[0]["parent_id"] == parent_id
        
        # Verify service was called
        mock_document_service.get_child_documents.assert_called_once_with(parent_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_document_parents(self, test_client, mock_document_service):
        """Test getting parent documents (full lineage) of a document."""
        doc_id = str(uuid.uuid4())
        expected_parents = [
            {
                "id": str(uuid.uuid4()),
                "title": "Root Parent",
                "path": "/root",
                "name": "root-parent",
                "is_api_ref": False,
                "parent_id": None,
                "is_deleted": False,
                "created_at": datetime.now().isoformat(),
                "current_version_id": None
            }
        ]
        mock_document_service.get_document_parents.return_value = expected_parents
        
        # Get document parents
        response = await test_client.get(f"/api/documents/{doc_id}/parents")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        parents = response.json()
        assert isinstance(parents, list)
        assert len(parents) == 1
        
        # Verify service was called
        mock_document_service.get_document_parents.assert_called_once_with(doc_id)
    
    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_all_documents(self, test_client, mock_document_service):
        """Test getting all documents with filters."""
        expected_response = {
            "en": {
                "documentation": [
                    {
                        "id": str(uuid.uuid4()),
                        "title": "Documentation 1",
                        "path": "/docs/doc1",
                        "name": "doc-1",
                        "is_api_ref": False,
                        "parent_id": None,
                        "is_deleted": False,
                        "created_at": datetime.now().isoformat(),
                        "current_version_id": None,
                        "markdown_content": "# Documentation 1",
                        "language": "en",
                        "keywords_array": ["docs", "api"],
                        "children": []
                    }
                ],
                "api_references": []
            },
            "ja": {
                "documentation": [],
                "api_references": []
            }
        }
        mock_document_service.get_all_documents.return_value = expected_response
        
        # Get all documents
        response = await test_client.get("/api/documents/")
        
        # Verify response
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "en" in result
        assert "ja" in result
        assert "documentation" in result["en"]
        assert "api_references" in result["en"]
        assert len(result["en"]["documentation"]) == 1
        
        # Verify service was called with defaults
        mock_document_service.get_all_documents.assert_called_once_with(False, None, None)