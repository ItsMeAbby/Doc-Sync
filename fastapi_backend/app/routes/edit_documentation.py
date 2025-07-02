
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query

from app.services.editor import MainEditor, update_markdown
from app.supabase import supabase


from app.models.edit_documentation import (
    EditDocumentationRequest,
    EditDocumentationResponse,
    ChangeRequest
)
from app.models.documents import DocumentContentCreate, DocumentContentRead, DocumentCreate
from app.routes.documents import create_document, create_document_version
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

@router.post("/update_documentation", summary="Update Documentation")
async def update_documentation(change_request: ChangeRequest)-> dict:
    """
    Endpoint to update documentation based on a change request.
    """
    try:
        if not change_request.edit and not change_request.create:
            raise HTTPException(status_code=400, detail="No changes to apply")
        
        # Process edits
        if change_request.edit:
            for edit in change_request.edit:
                updated_md=update_markdown(edit)
                await create_document_version(
                    doc_id=edit.document_id,
                    content=DocumentContentCreate(
                        markdown_content= updated_md,
                        language= edit.original_content.language,
                        name= edit.original_content.name,
                        title= edit.original_content.title,
                        path= edit.original_content.path
                    )
                )
        
        # Process created documents
        if change_request.create:
            for doc in change_request.create:
                for language,markdown_content in [("en", doc.markdown_content_en), ("ja", doc.markdown_content_ja)]:
                    await create_document(
                        document=DocumentCreate(
                            name=doc.name,
                            title=doc.title,
                            path=doc.path,
                            is_api_ref=doc.is_api_ref,
                            parent_id=doc.parent_id or None  # Handle optional parent_id

                        ),
                        content=DocumentContentCreate(
                            markdown_content= markdown_content,
                            language= language,
                        )
                    )

        return {"message": "Documentation updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
