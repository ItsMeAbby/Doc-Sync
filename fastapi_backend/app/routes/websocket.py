import asyncio
import json
import logging
import uuid
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.websockets import WebSocketState

from app.models.edit_documentation import EditDocumentationRequest
from app.models.websocket_events import (
    WebSocketMessage,
    ErrorEvent,
    FinishedEvent,
)
from app.core.services.edit_service import EditService
from app.api.dependencies import get_edit_service
from app.core.exceptions import handle_service_exception

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# Connection manager to track active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept WebSocket connection and store it"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")

    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            
        # Cancel any running task for this session
        if session_id in self.session_tasks:
            task = self.session_tasks[session_id]
            if not task.done():
                task.cancel()
            del self.session_tasks[session_id]
            
        logger.info(f"WebSocket disconnected for session: {session_id}")

    async def send_event(self, session_id: str, event):
        """Send event to specific WebSocket connection"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    message = WebSocketMessage(event=event)
                    await websocket.send_text(message.model_dump_json())
                else:
                    logger.warning(f"WebSocket not connected for session: {session_id}")
            except Exception as e:
                logger.error(f"Error sending message to session {session_id}: {e}")
                self.disconnect(session_id)

    def is_connected(self, session_id: str) -> bool:
        """Check if session is still connected"""
        return (session_id in self.active_connections and 
                self.active_connections[session_id].client_state == WebSocketState.CONNECTED)

# Global connection manager instance
manager = ConnectionManager()


async def process_edit_request_with_streaming(
    edit_request: EditDocumentationRequest,
    session_id: str,
    edit_service: EditService
):
    """Process edit request and stream progress events"""
    try:
        # Use the streaming version of the edit service
        async for event in edit_service.edit_documentation_stream(edit_request, session_id):
            if manager.is_connected(session_id):
                await manager.send_event(session_id, event)
            else:
                logger.info(f"Session {session_id} disconnected, stopping processing")
                break
                
        # Send final completion event
        if manager.is_connected(session_id):
            finished_event = FinishedEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={"message": "Edit documentation process completed successfully"}
            )
            await manager.send_event(session_id, finished_event)
            
    except asyncio.CancelledError:
        logger.info(f"Edit processing cancelled for session: {session_id}")
        if manager.is_connected(session_id):
            error_event = ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": "Processing was cancelled",
                    "error_type": "CancelledError"
                }
            )
            await manager.send_event(session_id, error_event)
    except Exception as e:
        logger.error(f"Error in edit processing for session {session_id}: {e}")
        if manager.is_connected(session_id):
            error_event = ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": str(e),
                    "error_type": type(e).__name__
                }
            )
            await manager.send_event(session_id, error_event)


@router.websocket("/edit-documentation")
async def websocket_edit_documentation(
    websocket: WebSocket,
    edit_service: EditService = Depends(get_edit_service)
):
    """
    WebSocket endpoint for streaming edit documentation progress.
    
    Expected message format:
    {
        "session_id": "unique-session-id",
        "edit_request": {
            "query": "user query",
            "document_id": "optional-document-id"
        }
    }
    """
    session_id = None
    try:
        await websocket.accept()
        logger.info("WebSocket connection accepted")
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                session_id = message.get("session_id")
                edit_request_data = message.get("edit_request")
                
                if not session_id:
                    await websocket.send_text(json.dumps({
                        "error": "session_id is required"
                    }))
                    continue
                    
                if not edit_request_data:
                    await websocket.send_text(json.dumps({
                        "error": "edit_request is required"
                    }))
                    continue
                
                # Store the connection
                manager.active_connections[session_id] = websocket
                
                # Parse edit request
                edit_request = EditDocumentationRequest(**edit_request_data)
                
                # Cancel any existing task for this session
                if session_id in manager.session_tasks:
                    old_task = manager.session_tasks[session_id]
                    if not old_task.done():
                        old_task.cancel()
                
                # Start processing in background task
                task = asyncio.create_task(
                    process_edit_request_with_streaming(edit_request, session_id, edit_service)
                )
                manager.session_tasks[session_id] = task
                
                logger.info(f"Started edit processing for session: {session_id}")
                
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "error": f"Error processing request: {str(e)}"
                }))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if session_id:
            manager.disconnect(session_id)