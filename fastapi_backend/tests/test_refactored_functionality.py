import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import uuid
from datetime import datetime

from app.core.services.document_service import DocumentService
from app.core.repositories.document_repository import DocumentRepository
from app.models.documents import DocumentCreate, DocumentContentCreate


class TestRefactoredFunctionality:
    """Test the refactored services and repositories work correctly"""
    
    @pytest.mark.asyncio
    async def test_document_service_create_document(self):
        """Test DocumentService.create_document works"""
        # Mock the repository and content processor
        with patch('app.core.services.document_service.DocumentRepository') as mock_repo_class, \
             patch('app.core.services.document_service.ContentRepository') as mock_content_repo_class, \
             patch('app.core.services.document_service.process_document_content') as mock_process:
            
            # Setup mocks
            mock_repo = MagicMock()
            mock_content_repo = MagicMock()
            mock_repo_class.return_value = mock_repo
            mock_content_repo_class.return_value = mock_content_repo
            
            doc_id = str(uuid.uuid4())
            version_id = str(uuid.uuid4())
            
            mock_repo.create_document = AsyncMock(return_value={"id": doc_id, "name": "test"})
            mock_content_repo.create_content = AsyncMock(return_value={"version": version_id})
            mock_repo.update_current_version = AsyncMock()
            mock_process.return_value = {"keywords_array": ["test"], "summary": "test summary"}
            
            # Create service and test
            service = DocumentService()
            document = DocumentCreate(name="test", title="Test Doc")
            content = DocumentContentCreate(markdown_content="# Test")
            
            result = await service.create_document(document, content)
            
            # Verify calls and result
            assert result["id"] == doc_id
            assert result["current_version_id"] == version_id
            mock_repo.create_document.assert_called_once()
            mock_content_repo.create_content.assert_called_once()
            mock_repo.update_current_version.assert_called_once_with(doc_id, version_id)
    
    @pytest.mark.asyncio
    async def test_document_repository_get_document_by_id(self):
        """Test DocumentRepository.get_document_by_id works"""
        with patch('app.core.repositories.document_repository.supabase') as mock_supabase:
            doc_id = str(uuid.uuid4())
            expected_doc = {
                "id": doc_id,
                "name": "test",
                "title": "Test Doc",
                "created_at": datetime.now().isoformat()
            }
            
            # Setup mock
            mock_result = MagicMock()
            mock_result.data = [expected_doc]
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result
            
            # Test
            result = await DocumentRepository.get_document_by_id(doc_id)
            
            # Verify
            assert result == expected_doc
            mock_supabase.table.assert_called_with("documents")
    
    @pytest.mark.asyncio
    async def test_routes_use_services(self):
        """Test that routes correctly use the service layer"""
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.api.dependencies import get_document_service
        
        mock_service = MagicMock()
        
        doc_id = str(uuid.uuid4())
        expected_doc = {
            "id": doc_id,
            "name": "test",
            "title": "Test Doc",
            "path": "/test/path",
            "is_api_ref": False,
            "parent_id": None,
            "created_at": datetime.now().isoformat(),
            "current_version_id": None,
            "is_deleted": False
        }
        mock_service.get_document = AsyncMock(return_value=expected_doc)
        
        # Override dependency
        app.dependency_overrides[get_document_service] = lambda: mock_service
        
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://localhost:8000"
            ) as client:
                response = await client.get(f"/api/documents/{doc_id}")
                
                # Verify service was called
                assert response.status_code == 200
                mock_service.get_document.assert_called_once_with(doc_id)
        finally:
            # Clean up
            app.dependency_overrides.clear()
    
    def test_main_app_creation(self):
        """Test that the main app can be created without errors"""
        from app.main import create_app
        
        app = create_app()
        assert app is not None
        assert hasattr(app, 'routes')
    
    def test_dependencies_work(self):
        """Test that dependency injection works"""
        from app.api.dependencies import get_document_service, get_edit_service
        
        doc_service = get_document_service()
        edit_service = get_edit_service()
        
        assert doc_service is not None
        assert edit_service is not None
        assert hasattr(doc_service, 'create_document')
        assert hasattr(edit_service, 'edit_documentation')
    
    def test_exception_handling(self):
        """Test that custom exceptions work properly"""
        from app.core.exceptions import DocumentNotFoundError, handle_service_exception
        
        # Test custom exception
        error = DocumentNotFoundError("test-id")
        assert "test-id" in str(error)
        
        # Test exception handler
        http_exception = handle_service_exception(error)
        assert http_exception.status_code == 404