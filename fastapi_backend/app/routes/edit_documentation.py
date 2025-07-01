
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query

from app.services.editor import MainEditor
from app.supabase import supabase


from app.models.edit_documentation import (
    EditDocumentationRequest,
    EditDocumentationResponse
)
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
