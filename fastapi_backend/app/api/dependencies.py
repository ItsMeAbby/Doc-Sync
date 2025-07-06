from app.core.services.document_service import DocumentService
from app.core.services.edit_service import EditService, InlineEditService


def get_document_service() -> DocumentService:
    """Dependency to get document service instance"""
    return DocumentService()


def get_edit_service() -> EditService:
    """Dependency to get edit service instance"""
    return EditService()

def get_inline_edit_service() -> InlineEditService:
    """Dependency to get inline edit service instance"""
    return InlineEditService()
