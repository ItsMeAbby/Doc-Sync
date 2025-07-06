from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, Field

from app.services.agents.create_content_agent import GeneratedDocument
from app.services.agents.editor_agent import DocumentEdit, ContentChange
from app.services.agents.delete_content_agent import DocumentToDelete


class EditDocumentationRequest(BaseModel):
    query: str
    document_id: Optional[str] = None

class InLineEditRequest(BaseModel):
    """
    Represents a request to perform inline edits on documentation.
    This is used to update the documentation based on the changes suggested by the editor.
    """

    query: str = Field(
        ...,
        description="The query or instruction for editing the documentation.",
    )
    selected_text: str = Field(
        ...,
        description="The text that has been selected for inline editing.",
    )

class InLineEditResponse(BaseModel):
    """
    Represents the response for inline edit requests.
    Contains the original text, edited text, and a message indicating success or failure.
    """

    query: str = Field(
        ...,
        description="The query or instruction for editing the documentation.",
    )
    original_text: str = Field(
        ...,
        description="The original text that was selected for inline editing.",
    )
    edited_text: str = Field(
        ...,
        description="The text after inline edits have been applied.",
    )
    message: str = Field(
        default="Inline edit processed successfully.",
        description="Message indicating the result of the inline edit operation.",
    )

class InLineEditAgentResponse(BaseModel):
    """
    Represents the response from the inline edit agent.
    Contains the edited text
    """

    edited_text: str = Field(
        ...,
        description="The text after inline edits have been applied.",
    )

class EditGuardrailResponse(BaseModel):
    not_edit_request: bool
    reasoning: str


class EditDocumentationResponse(BaseModel):
    edit: Optional[List[DocumentEdit]] = Field(
        default=[], description="List of suggested edits to be made to the document."
    )
    create: Optional[List[GeneratedDocument]] = Field(
        default=[], description="List of newly created documents based on the query."
    )
    delete: Optional[List[DocumentToDelete]] = Field(
        default=[],
        description="List of documents identified for deletion based on the query.",
    )


# Create OriginalContent model for storing original document content
class OriginalContent(BaseModel):
    markdown_content: str
    language: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    path: Optional[str] = None


# Enhanced DocumentEdit with original content
class DocumentEditWithOriginal(BaseModel):
    document_id: str
    changes: List[ContentChange] = Field(
        default=[], description="List of changes to be made to the document"
    )
    version: str
    original_content: Optional[OriginalContent] = None


# class ChangeRequest with original content for each item
class ChangeRequest(BaseModel):
    """
    Represents a request to change documentation.
    This is used to update the documentation based on the changes suggested by the editor.
    Each item in the lists includes original content information.
    """

    edit: Optional[List[DocumentEditWithOriginal]] = Field(
        default=[],
        description="List of suggested edits to be made to the document with original content.",
    )
    create: Optional[List[GeneratedDocument]] = Field(
        default=[], description="List of newly created documents based on the query"
    )
    delete: Optional[List[DocumentToDelete]] = Field(
        default=[], description="List of documents to be deleted"
    )


class ProcessingError(BaseModel):
    """Error details for failed processing"""

    error_message: str
    error_type: str


class UpdateDocumentationResponse(BaseModel):
    """
    Response for update_documentation endpoint with detailed results
    """

    message: str
    total_processed: int
    successful: int
    failed: int
    failed_items: Optional[ChangeRequest] = Field(
        default=None,
        description="Change request containing only the items that failed processing",
    )
    errors: Optional[List[ProcessingError]] = Field(
        default=[], description="Detailed error information"
    )

class InLineEditGuardrailException(Exception):
    """
    Exception raised when the inline edit guardrail is triggered.
    This indicates that the input does not meet the criteria for inline editing.
    """

    def __init__(self, message: str = "Input does not meet inline edit criteria."):
        super().__init__(message)
        self.message = message