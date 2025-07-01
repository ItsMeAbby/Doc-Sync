from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, Field

from app.services.agents.create_content_agent import GeneratedDocument
from app.services.agents.editor_agent import DocumentEdit

class EditDocumentationRequest(BaseModel):
    query: str
    document_id: Optional[str] = None

class EditDocumentationResponse(BaseModel):
    edit: Optional[List[DocumentEdit]] = Field(
        default=[],
        description="List of suggested edits to be made to the document."
    )
    create: Optional[List[GeneratedDocument]] = Field(
        default=[],
        description="List of newly created documents based on the query."
    )