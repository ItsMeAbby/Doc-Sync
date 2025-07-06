import asyncio
import logging
from typing import List, Optional, Tuple

from app.models.edit_documentation import (
    EditDocumentationRequest,
    EditDocumentationResponse,
    ChangeRequest,
    InLineEditGuardrailException,
    InLineEditRequest,
    InLineEditResponse,
    UpdateDocumentationResponse,
    ProcessingError,
    DocumentEditWithOriginal
)
from app.models.documents import DocumentContentCreate, DocumentCreate
from app.services.agents.create_content_agent import GeneratedDocument
from app.services.agents.delete_content_agent import DocumentToDelete
from app.services.editor import MainEditor, update_markdown, InlineEditor
from app.core.services.document_service import DocumentService
from app.core.repositories.document_repository import DocumentRepository
from app.core.exceptions import ValidationError, DocumentNotFoundError, DocumentDeletedError

logger = logging.getLogger(__name__)

class InlineEditService:
    def __init__(self):
        pass
    async def inline_edit(self,inline_edit_request:InLineEditRequest) -> InLineEditResponse:
        """
        Perform inline edits on documentation.
        This method uses the inline editor agent to apply changes to the selected text.
        """
        editor = InlineEditor(
            query=inline_edit_request.query,
            selected_text=inline_edit_request.selected_text
        )
        try:
            agent_response=await editor.run()
            return InLineEditResponse(
                query=inline_edit_request.query,
                original_text=inline_edit_request.selected_text,
                edited_text=agent_response.edited_text,
                message="Inline edit processed successfully."
            )
        except InLineEditGuardrailException as guardrail_error:
            return InLineEditResponse(
                query=inline_edit_request.query,
                original_text=inline_edit_request.selected_text,
                edited_text=inline_edit_request.selected_text,  # No changes made
                message= guardrail_error.__str__()  # Return the guardrail error message as the response message
            )


class EditService:
    def __init__(self):
        self.document_service = DocumentService()
        self.doc_repo = DocumentRepository()

    async def edit_documentation(self, edit_request: EditDocumentationRequest) -> EditDocumentationResponse:
        """Edit documentation based on a query"""
        editor = MainEditor(query=edit_request.query,document_id=edit_request.document_id)
        return await editor.run()

    def validate_edit_item(self, edit: DocumentEditWithOriginal) -> Optional[str]:
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

    def validate_create_item(self, doc: GeneratedDocument) -> Optional[str]:
        """Validate a single create item. Returns error message if invalid, None if valid."""
        if not doc.name:
            return "Missing document name"
        if not doc.title:
            return "Missing document title"
        if not doc.markdown_content_en and not doc.markdown_content_ja:
            return "Missing markdown content for both languages"
        return None

    def validate_delete_item(self, doc: DocumentToDelete) -> Optional[str]:
        """Validate a single delete item. Returns error message if invalid, None if valid."""
        if not doc.document_id:
            return "Missing document_id"
        if not doc.version:
            return "Missing version"
        return None

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document by marking it as deleted. Returns True if successful."""
        try:
            return await self.doc_repo.delete_document(document_id)
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            return False

    async def process_single_edit(self, edit: DocumentEditWithOriginal) -> Tuple[bool, Optional[str]]:
        """Process a single edit item. Returns (success, error_message)."""
        try:
            # Validate first
            validation_error = self.validate_edit_item(edit)
            if validation_error:
                return False, f"Validation error: {validation_error}"
            
            # Verify document exists and is not deleted
            try:
                document = await self.doc_repo.get_document_by_id(edit.document_id)
                if document.get("is_deleted", False):
                    return False, f"Document {edit.document_id} is deleted and cannot be edited"
            except DocumentNotFoundError:
                return False, f"Document {edit.document_id} not found"
            
            # Process the edit
            updated_md = update_markdown(edit)
            
            # Create new document version with updated content
            await self.document_service.create_document_version(
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

    async def process_single_create(self, doc: GeneratedDocument) -> Tuple[bool, Optional[str]]:
        """Process a single create item. Returns (success, error_message)."""
        try:
            # Validate first
            validation_error = self.validate_create_item(doc)
            if validation_error:
                return False, f"Validation error: {validation_error}"
            
            # Process both languages
            for language, markdown_content in [("en", doc.markdown_content_en), ("ja", doc.markdown_content_ja)]:
                if markdown_content:  # Only create if content exists
                    await self.document_service.create_document(
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

    async def process_single_delete(self, doc: DocumentToDelete) -> Tuple[bool, Optional[str]]:
        """Process a single delete item. Returns (success, error_message)."""
        try:
            # Validate first
            validation_error = self.validate_delete_item(doc)
            if validation_error:
                return False, f"Validation error: {validation_error}"
            
            # Verify document exists and is not already deleted
            try:
                document = await self.doc_repo.get_document_by_id(doc.document_id)
                if document.get("is_deleted", False):
                    return False, f"Document {doc.document_id} is already deleted"
            except DocumentNotFoundError:
                return False, f"Document {doc.document_id} not found"
            
            # Delete the document
            success = await self.delete_document(doc.document_id)
            if success:
                return True, None
            else:
                return False, f"Failed to delete document {doc.document_id}"
                
        except Exception as e:
            logger.error(f"Error processing delete for document {doc.document_id}: {str(e)}")
            return False, str(e)

    async def update_documentation(self, change_request: ChangeRequest) -> UpdateDocumentationResponse:
        """Update documentation based on a change request. Processes items concurrently and returns detailed results including failures."""
        if not change_request.edit and not change_request.create and not change_request.delete:
            raise ValidationError("change_request", "No changes to apply")
        
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
            edit_tasks = [self.process_single_edit(edit) for edit in edit_items]
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
            create_tasks = [self.process_single_create(doc) for doc in create_items]
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
            delete_tasks = [self.process_single_delete(doc) for doc in delete_items]
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