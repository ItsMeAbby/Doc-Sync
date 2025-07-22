from typing import Any, Literal, Union
from datetime import datetime
from pydantic import BaseModel, Field

from app.services.agents.edit_suggestion_agent import EditAgentResponse
from app.services.agents.editor_agent import DocumentEdit
from app.services.agents.create_content_agent import GeneratedDocument
from app.services.agents.delete_content_agent import DocumentToDelete
from app.services.agents.intent_detection_agent import Detected_Intent


class BaseEvent(BaseModel):
    """Base event model for WebSocket streaming"""
    event_id: str = Field(..., description="Unique identifier for the event")
    timestamp: datetime = Field(default_factory=datetime.now)
    session_id: str = Field(..., description="Session identifier for the request")


class IntentDetectedEvent(BaseEvent):
    """Event emitted when user intent is detected"""
    type: Literal["intent_detected"] = "intent_detected"
    payload: Detected_Intent


class SuggestionsFoundEvent(BaseEvent):
    """Event emitted when edit suggestions are found"""
    type: Literal["suggestions_found"] = "suggestions_found"
    payload: EditAgentResponse


class DocumentProcessingEvent(BaseEvent):
    """Event emitted when starting to process a specific document"""
    type: Literal["document_processing"] = "document_processing"
    payload: dict = Field(..., description="Document metadata being processed")


class DocumentCompletedEvent(BaseEvent):
    """Event emitted when a document edit is completed"""
    type: Literal["document_completed"] = "document_completed"
    payload: DocumentEdit


class DocumentCreatedEvent(BaseEvent):
    """Event emitted when a new document is created"""
    type: Literal["document_created"] = "document_created"
    payload: GeneratedDocument


class DocumentDeletedEvent(BaseEvent):
    """Event emitted when a document is deleted"""
    type: Literal["document_deleted"] = "document_deleted"
    payload: DocumentToDelete


class ErrorEvent(BaseEvent):
    """Event emitted when an error occurs during processing"""
    type: Literal["error"] = "error"
    payload: dict = Field(..., description="Error details including message and error_type")


class FinishedEvent(BaseEvent):
    """Event emitted when all processing is complete"""
    type: Literal["finished"] = "finished"
    payload: dict = Field(..., description="Summary of completed operations")


class ProgressEvent(BaseEvent):
    """Event emitted to show overall progress"""
    type: Literal["progress"] = "progress"
    payload: dict = Field(..., description="Progress information with current step and total steps")


# Union type for all possible events
EditProgressEvent = Union[
    IntentDetectedEvent,
    SuggestionsFoundEvent,
    DocumentProcessingEvent,
    DocumentCompletedEvent,
    DocumentCreatedEvent,
    DocumentDeletedEvent,
    ErrorEvent,
    FinishedEvent,
    ProgressEvent,
]


class WebSocketMessage(BaseModel):
    """WebSocket message wrapper"""
    event: EditProgressEvent
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }