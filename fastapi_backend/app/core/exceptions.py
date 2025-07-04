from fastapi import HTTPException
from typing import Optional


class DocumentNotFoundError(Exception):
    def __init__(self, document_id: str):
        self.document_id = document_id
        super().__init__(f"Document {document_id} not found")


class DocumentDeletedError(Exception):
    def __init__(self, document_id: str):
        self.document_id = document_id
        super().__init__(f"Document {document_id} is deleted and cannot be accessed")


class DocumentCreationError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Failed to create document: {message}")


class DocumentUpdateError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Failed to update document: {message}")


class ContentProcessingError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Content processing error: {message}")


class ValidationError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(f"Validation error for {field}: {message}")


def handle_service_exception(e: Exception) -> HTTPException:
    """Convert service exceptions to HTTP exceptions"""
    if isinstance(e, DocumentNotFoundError):
        return HTTPException(status_code=404, detail=str(e))
    elif isinstance(e, DocumentDeletedError):
        return HTTPException(status_code=410, detail=str(e))
    elif isinstance(e, ValidationError):
        return HTTPException(status_code=400, detail=str(e))
    elif isinstance(
        e, (DocumentCreationError, DocumentUpdateError, ContentProcessingError)
    ):
        return HTTPException(status_code=500, detail=str(e))
    else:
        return HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
