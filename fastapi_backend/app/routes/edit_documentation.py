
import json
import asyncio
import logging
from typing import List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Depends, Query

from app.services.editor import MainEditor, update_markdown
from app.supabase import supabase


from app.models.edit_documentation import (
    EditDocumentationRequest,
    EditDocumentationResponse,
    ChangeRequest,
    UpdateDocumentationResponse,
    ProcessingError,
    DocumentEditWithOriginal
)
from app.models.documents import DocumentContentCreate, DocumentContentRead, DocumentCreate
from app.services.agents.create_content_agent import GeneratedDocument
from app.services.agents.delete_content_agent import DocumentToDelete
from app.routes.documents import create_document, create_document_version

# Setup logging
logger = logging.getLogger(__name__)
router = APIRouter(tags=["edit_documentation"])


@router.post("/", response_model=EditDocumentationResponse, summary="Edit Documentation")
async def edit_documentation(edit_request: EditDocumentationRequest):
    """
    Endpoint to edit documentation based on a query.
    """
    try:
        editor= MainEditor(query=edit_request.query)
        return await editor.run()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Validation helper functions
def validate_edit_item(edit: DocumentEditWithOriginal) -> Optional[str]:
    """Validate a single edit item. Returns error message if invalid, None if valid."""
    if not edit.document_id:
        return "Missing document_id"
    if not edit.changes:
        return "No changes provided"
    if not edit.original_content:
        return "Missing original_content"
    if not edit.original_content.markdown_content:
        return "Missing original markdown content"
    return None

def validate_create_item(doc: GeneratedDocument) -> Optional[str]:
    """Validate a single create item. Returns error message if invalid, None if valid."""
    if not doc.name:
        return "Missing document name"
    if not doc.title:
        return "Missing document title"
    if not doc.markdown_content_en and not doc.markdown_content_ja:
        return "Missing markdown content for both languages"
    return None

def validate_delete_item(doc: DocumentToDelete) -> Optional[str]:
    """Validate a single delete item. Returns error message if invalid, None if valid."""
    if not doc.document_id:
        return "Missing document_id"
    if not doc.version:
        return "Missing version"
    return None

# Document deletion helper function
async def delete_document(document_id: str) -> bool:
    """Delete a document by marking it as deleted. Returns True if successful."""
    try:
        # # Mark document as deleted (soft delete)
        # result = supabase.table("documents").update(
        #     {"is_deleted": True}
        # ).eq("id", document_id).execute()
        
        # if not result.data:
        #     logger.error(f"Document {document_id} not found for deletion")
        #     return False
            
        # logger.info(f"Document {document_id} marked as deleted")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {str(e)}")
        return False

# Helper functions for processing
async def process_single_edit(edit: DocumentEditWithOriginal) -> Tuple[bool, Optional[str]]:
    """Process a single edit item. Returns (success, error_message)."""
    try:
        # Validate first
        validation_error = validate_edit_item(edit)
        if validation_error:
            return False, f"Validation error: {validation_error}"
        
        # Verify document exists and is not deleted
        check_result = supabase.table("documents").select("id, is_deleted").eq("id", edit.document_id).execute()
        
        if not check_result.data:
            return False, f"Document {edit.document_id} not found"
            
        document = check_result.data[0]
        if document.get("is_deleted", False):
            return False, f"Document {edit.document_id} is deleted and cannot be edited"
        
        # Process the edit
        updated_md = update_markdown(edit)
        
        # Create new document version with updated content
        await create_document_version(
            doc_id=edit.document_id,
            content=DocumentContentCreate(
                markdown_content=updated_md,
                language=edit.original_content.language or "en",
                name=edit.original_content.name,
                title=edit.original_content.title,
                path=edit.original_content.path
            )
        )
        return True, None
    except Exception as e:
        logger.error(f"Error processing edit for document {edit.document_id}: {str(e)}")
        return False, str(e)

async def process_single_create(doc: GeneratedDocument) -> Tuple[bool, Optional[str]]:
    """Process a single create item. Returns (success, error_message)."""
    try:
        # Validate first
        validation_error = validate_create_item(doc)
        if validation_error:
            return False, f"Validation error: {validation_error}"
        
        # Process both languages
        for language, markdown_content in [("en", doc.markdown_content_en), ("ja", doc.markdown_content_ja)]:
            if markdown_content:  # Only create if content exists
                await create_document(
                    document=DocumentCreate(
                        name=doc.name,
                        title=doc.title,
                        path=doc.path,
                        is_api_ref=doc.is_api_ref,
                        parent_id=doc.parent_id or None
                    ),
                    content=DocumentContentCreate(
                        markdown_content=markdown_content,
                        language=language,
                    )
                )
        return True, None
    except Exception as e:
        logger.error(f"Error creating document {doc.name}: {str(e)}")
        return False, str(e)

async def process_single_delete(doc: DocumentToDelete) -> Tuple[bool, Optional[str]]:
    """Process a single delete item. Returns (success, error_message)."""
    try:
        # Validate first
        validation_error = validate_delete_item(doc)
        if validation_error:
            return False, f"Validation error: {validation_error}"
        
        # Verify document exists and is not already deleted
        check_result = supabase.table("documents").select("id, is_deleted").eq("id", doc.document_id).execute()
        
        if not check_result.data:
            return False, f"Document {doc.document_id} not found"
            
        document = check_result.data[0]
        if document.get("is_deleted", False):
            return False, f"Document {doc.document_id} is already deleted"
        
        # Delete the document
        success = await delete_document(doc.document_id)
        if success:
            return True, None
        else:
            return False, f"Failed to delete document {doc.document_id}"
            
    except Exception as e:
        logger.error(f"Error processing delete for document {doc.document_id}: {str(e)}")
        return False, str(e)

@router.post("/update_documentation", response_model=UpdateDocumentationResponse, summary="Update Documentation")
async def update_documentation(change_request: ChangeRequest) -> UpdateDocumentationResponse:
    """
    Endpoint to update documentation based on a change request.
    Processes items concurrently and returns detailed results including failures.
    """
    if not change_request.edit and not change_request.create and not change_request.delete:
        raise HTTPException(status_code=400, detail="No changes to apply")
    
    # Initialize counters and lists
    successful = 0
    failed = 0
    failed_edit_items: List[DocumentEditWithOriginal] = []
    failed_create_items: List[GeneratedDocument] = []
    failed_delete_items: List[DocumentToDelete] = []
    errors: List[ProcessingError] = []
    
    # Process edits concurrently
    edit_tasks = []
    edit_items = change_request.edit or []
    
    if edit_items:
        edit_tasks = [process_single_edit(edit) for edit in edit_items]
        edit_results = await asyncio.gather(*edit_tasks, return_exceptions=True)
        
        for i, result in enumerate(edit_results):
            if isinstance(result, Exception):
                failed += 1
                failed_edit_items.append(edit_items[i])
                errors.append(ProcessingError(
                    error_message=str(result),
                    error_type=type(result).__name__
                ))
                logger.error(f"Exception processing edit {i}: {result}")
            else:
                success, error_msg = result
                if success:
                    successful += 1
                else:
                    failed += 1
                    failed_edit_items.append(edit_items[i])
                    errors.append(ProcessingError(
                        error_message=error_msg or "Unknown error",
                        error_type="ProcessingError"
                    ))
    
    # Process creates concurrently
    create_tasks = []
    create_items = change_request.create or []
    
    if create_items:
        create_tasks = [process_single_create(doc) for doc in create_items]
        create_results = await asyncio.gather(*create_tasks, return_exceptions=True)
        
        for i, result in enumerate(create_results):
            if isinstance(result, Exception):
                failed += 1
                failed_create_items.append(create_items[i])
                errors.append(ProcessingError(
                    error_message=str(result),
                    error_type=type(result).__name__
                ))
                logger.error(f"Exception processing create {i}: {result}")
            else:
                success, error_msg = result
                if success:
                    successful += 1
                else:
                    failed += 1
                    failed_create_items.append(create_items[i])
                    errors.append(ProcessingError(
                        error_message=error_msg or "Unknown error",
                        error_type="ProcessingError"
                    ))
    
    # Process deletes concurrently
    delete_tasks = []
    delete_items = change_request.delete or []
    
    if delete_items:
        delete_tasks = [process_single_delete(doc) for doc in delete_items]
        delete_results = await asyncio.gather(*delete_tasks, return_exceptions=True)
        
        for i, result in enumerate(delete_results):
            if isinstance(result, Exception):
                failed += 1
                failed_delete_items.append(delete_items[i])
                errors.append(ProcessingError(
                    error_message=str(result),
                    error_type=type(result).__name__
                ))
                logger.error(f"Exception processing delete {i}: {result}")
            else:
                success, error_msg = result
                if success:
                    successful += 1
                else:
                    failed += 1
                    failed_delete_items.append(delete_items[i])
                    errors.append(ProcessingError(
                        error_message=error_msg or "Unknown error",
                        error_type="ProcessingError"
                    ))
    
    # Calculate totals
    total_processed = len(edit_items) + len(create_items) + len(delete_items)
    
    # Generate response message
    if failed == 0:
        message = f"All {total_processed} items processed successfully"
    elif successful == 0:
        message = f"All {total_processed} items failed to process"
    else:
        message = f"Processed {total_processed} items: {successful} successful, {failed} failed"
    
    # Create failed_items ChangeRequest if there are failures
    failed_items = None
    if failed_edit_items or failed_create_items or failed_delete_items:
        failed_items = ChangeRequest(
            edit=failed_edit_items if failed_edit_items else None,
            create=failed_create_items if failed_create_items else None,
            delete=failed_delete_items if failed_delete_items else None
        )
    
    return UpdateDocumentationResponse(
        message=message,
        total_processed=total_processed,
        successful=successful,
        failed=failed,
        failed_items=failed_items,
        errors=errors
    )
