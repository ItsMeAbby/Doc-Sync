import pytest
from fastapi import HTTPException
from app.core.exceptions import (
    DocumentNotFoundError,
    DocumentDeletedError,
    DocumentCreationError,
    DocumentUpdateError,
    ContentProcessingError,
    ValidationError,
    handle_service_exception
)


class TestDocumentExceptions:
    """Test custom document exceptions"""
    
    def test_document_not_found_error(self):
        """Test DocumentNotFoundError exception"""
        doc_id = "test-document-123"
        error = DocumentNotFoundError(doc_id)
        
        assert error.document_id == doc_id
        assert str(error) == f"Document {doc_id} not found"
        assert isinstance(error, Exception)
    
    def test_document_deleted_error(self):
        """Test DocumentDeletedError exception"""
        doc_id = "deleted-document-456"
        error = DocumentDeletedError(doc_id)
        
        assert error.document_id == doc_id
        assert str(error) == f"Document {doc_id} is deleted and cannot be accessed"
        assert isinstance(error, Exception)
    
    def test_document_creation_error(self):
        """Test DocumentCreationError exception"""
        message = "Database connection failed"
        error = DocumentCreationError(message)
        
        assert str(error) == f"Failed to create document: {message}"
        assert isinstance(error, Exception)
    
    def test_document_update_error(self):
        """Test DocumentUpdateError exception"""
        message = "Invalid update data"
        error = DocumentUpdateError(message)
        
        assert str(error) == f"Failed to update document: {message}"
        assert isinstance(error, Exception)
    
    def test_content_processing_error(self):
        """Test ContentProcessingError exception"""
        message = "Failed to parse markdown"
        error = ContentProcessingError(message)
        
        assert str(error) == f"Content processing error: {message}"
        assert isinstance(error, Exception)
    
    def test_validation_error(self):
        """Test ValidationError exception"""
        field = "email"
        message = "Invalid email format"
        error = ValidationError(field, message)
        
        assert error.field == field
        assert str(error) == f"Validation error for {field}: {message}"
        assert isinstance(error, Exception)


class TestHandleServiceException:
    """Test the handle_service_exception function"""
    
    def test_handle_document_not_found_error(self):
        """Test handling DocumentNotFoundError"""
        error = DocumentNotFoundError("test-doc-123")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 404
        assert http_exception.detail == "Document test-doc-123 not found"
    
    def test_handle_document_deleted_error(self):
        """Test handling DocumentDeletedError"""
        error = DocumentDeletedError("deleted-doc-456")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 410
        assert http_exception.detail == "Document deleted-doc-456 is deleted and cannot be accessed"
    
    def test_handle_validation_error(self):
        """Test handling ValidationError"""
        error = ValidationError("title", "Title cannot be empty")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 400
        assert http_exception.detail == "Validation error for title: Title cannot be empty"
    
    def test_handle_document_creation_error(self):
        """Test handling DocumentCreationError"""
        error = DocumentCreationError("Database unavailable")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert http_exception.detail == "Failed to create document: Database unavailable"
    
    def test_handle_document_update_error(self):
        """Test handling DocumentUpdateError"""
        error = DocumentUpdateError("Insufficient permissions")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert http_exception.detail == "Failed to update document: Insufficient permissions"
    
    def test_handle_content_processing_error(self):
        """Test handling ContentProcessingError"""
        error = ContentProcessingError("Markdown parsing failed")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert http_exception.detail == "Content processing error: Markdown parsing failed"
    
    def test_handle_generic_exception(self):
        """Test handling generic exception"""
        error = RuntimeError("Unexpected error occurred")
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert http_exception.detail == "An error occurred: Unexpected error occurred"
    
    def test_handle_exception_with_no_message(self):
        """Test handling exception with no message"""
        error = Exception()
        http_exception = handle_service_exception(error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert http_exception.detail == "An error occurred: "
    
    def test_handle_multiple_inheritance_exception(self):
        """Test handling exception that inherits from multiple classes"""
        class CustomError(DocumentCreationError, ValueError):
            pass
        
        error = CustomError("Custom error message")
        http_exception = handle_service_exception(error)
        
        # Should be handled as DocumentCreationError (first match wins)
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == 500
        assert "Failed to create document: Custom error message" in http_exception.detail
