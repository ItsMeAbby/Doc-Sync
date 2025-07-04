
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.models.documents import (
    DocumentCreate,
    DocumentRead,
    GetAllDocumentsResponse,
    DocumentUpdate,
    DocumentContentCreate,
    DocumentContentRead,
)
from app.core.services.document_service import DocumentService
from app.core.exceptions import handle_service_exception
from app.api.dependencies import get_document_service

router = APIRouter(tags=["documents"])


@router.post("/", response_model=DocumentRead)
async def create_document(
    document: DocumentCreate, 
    content: Optional[DocumentContentCreate] = None,
    service: DocumentService = Depends(get_document_service)
):
    """
    Create a new document with optional content.
    If content is not provided, only the document metadata is created (useful for folder structure).
    """
    try:
        return await service.create_document(document, content)
    except Exception as e:
        raise handle_service_exception(e)

@router.get("/root", response_model=List[DocumentRead])
async def get_root_documents(
    is_api_ref: Optional[bool] = None,
    service: DocumentService = Depends(get_document_service)
):
    """Get all root-level documents (no parent)"""
    try:
        return await service.get_root_documents(is_api_ref)
    except Exception as e:
        raise handle_service_exception(e)


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_document(
    doc_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get document metadata + latest version"""
    try:
        return await service.get_document(doc_id)
    except Exception as e:
        raise handle_service_exception(e)


@router.get("/{doc_id}/versions", response_model=List[DocumentContentRead])
async def list_document_versions(
    doc_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """List all versions of a document"""
    try:
        return await service.list_document_versions(doc_id)
    except Exception as e:
        raise handle_service_exception(e)


@router.get("/{doc_id}/versions/{version_id}", response_model=DocumentContentRead)
async def get_document_version(
    doc_id: str, 
    version_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get a specific version (optional: `latest` as alias)"""
    try:
        return await service.get_document_version(doc_id, version_id)
    except Exception as e:
        raise handle_service_exception(e)



@router.get("/{parent_id}/children", response_model=List[DocumentRead])
async def get_child_documents(
    parent_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get all child documents"""
    try:
        return await service.get_child_documents(parent_id)
    except Exception as e:
        raise handle_service_exception(e)




@router.get("/{doc_id}/parents", response_model=List[DocumentRead])
async def get_document_parents(
    doc_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get all ancestors (full lineage)"""
    try:
        return await service.get_document_parents(doc_id)
    except Exception as e:
        raise handle_service_exception(e)




@router.get("/",response_model=GetAllDocumentsResponse)
async def get_all_documents(
    is_deleted: Optional[bool] = Query(False),
    is_api_ref: Optional[bool] = None,
    parent_id: Optional[str] = None,
    service: DocumentService = Depends(get_document_service)
)-> GetAllDocumentsResponse:
    """Get all documents with complete hierarchy (with optional filters) and its content"""
    try:
        return await service.get_all_documents(is_deleted, is_api_ref, parent_id)
    except Exception as e:
        raise handle_service_exception(e)


@router.put("/{doc_id}", response_model=DocumentRead)
async def update_document(
    doc_id: str, 
    document: DocumentUpdate,
    service: DocumentService = Depends(get_document_service)
):
    """Update document metadata (title, path, etc.) or delete it"""
    try:
        return await service.update_document(doc_id, document)
    except Exception as e:
        raise handle_service_exception(e)


@router.post("/{doc_id}/versions", response_model=DocumentContentRead)
async def create_document_version(
    doc_id: str, 
    content: DocumentContentCreate,
    service: DocumentService = Depends(get_document_service)
)-> DocumentContentRead:
    """Create a new version for a document (and update latest version)"""
    try:
        return await service.create_document_version(doc_id, content)
    except Exception as e:
        raise handle_service_exception(e)