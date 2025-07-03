from typing import List, Optional
from pydantic import BaseModel


class ContentChange(BaseModel):
    """
    Represents a change to be made in the document.
    """
    old_string: str
    """The text to replace (must be unique within the provided content)."""
    new_string: str
    """The text to replace it with (must be unique within the provided content)."""


class DocumentEdit(BaseModel):
    """
    Represents a suggested edit to a document.
    """
    document_id: str
    """The ID of the document to be edited."""
    changes: List[ContentChange]
    """Users should provide a list of changes to be made in the document."""
    version: str
    """The version of the document to be edited."""


class Edits(BaseModel):
    """
    Represents a collection of edits to be made to multiple documents.
    """
    changes: List[DocumentEdit]
    """A list of document edits to be applied."""


class GeneratedDocument(BaseModel):
    """
    Represents a document to be created with content in multiple languages.
    """
    name: str
    title: str
    path: Optional[str] = None
    is_api_ref: bool = False
    parent_id: Optional[str] = None
    markdown_content_en: Optional[str] = None
    markdown_content_ja: Optional[str] = None


class DocumentToDelete(BaseModel):
    """
    Represents a document to be deleted.
    """
    document_id: str
    version: str
    reason: Optional[str] = None


class DocumentSuggestion(BaseModel):
    """
    Represents a suggested edit to a document with explanation.
    """
    document_id: str
    version: str
    suggested_changes: str
    reason: str
    priority: str  # "high", "medium", "low"


class Intent(BaseModel):
    """
    Represents a detected intent from user query.
    """
    intent: str  # "edit", "create", "delete", "move", "other"
    reason: str
    confidence: float
    target_documents: Optional[List[str]] = None


class DetectedIntents(BaseModel):
    """
    Collection of detected intents from a user query.
    """
    intents: List[Intent]
    primary_intent: str