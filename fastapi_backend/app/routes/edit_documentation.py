from fastapi import APIRouter, HTTPException, Depends

from app.models.edit_documentation import (
    EditDocumentationRequest,
    EditDocumentationResponse,
    ChangeRequest,
    UpdateDocumentationResponse,
)
from app.core.services.edit_service import EditService
from app.core.exceptions import handle_service_exception
from app.api.dependencies import get_edit_service

router = APIRouter(tags=["edit_documentation"])


@router.post(
    "/", response_model=EditDocumentationResponse, summary="Edit Documentation"
)
async def edit_documentation(
    edit_request: EditDocumentationRequest,
    service: EditService = Depends(get_edit_service),
):
    """
    Endpoint to edit documentation based on a query.
    """
    try:
        return await service.edit_documentation(edit_request)
    except Exception as e:
        raise handle_service_exception(e)


@router.post(
    "/update_documentation",
    response_model=UpdateDocumentationResponse,
    summary="Update Documentation",
)
async def update_documentation(
    change_request: ChangeRequest, service: EditService = Depends(get_edit_service)
) -> UpdateDocumentationResponse:
    """
    Endpoint to update documentation based on a change request.
    Processes items concurrently and returns detailed results including failures.
    """
    try:
        return await service.update_documentation(change_request)
    except Exception as e:
        raise handle_service_exception(e)
