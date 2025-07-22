from app.services.agents.edit_suggestion_agent import (
    EditAgentResponse,
    edit_suggestion_agent,
)
from app.services.agents.editor_agent import DocumentEdit, edit_content_agent, Edits
from app.services.agents.intent_detection_agent import Detected_Intent, intent_agent
from app.services.agents.delete_content_agent import (
    delete_content_agent,
    DocumentToDelete,
    DeleteContentResponse,
)
from app.services.agents.create_content_agent import (
    CreateContentResponse,
    GeneratedDocument,
    create_content_agent,
)
from app.services.agents.inlineedit_agent import (
    inline_edit_agent,
)
from app.services.shared.models import ApiRef
from agents import InputGuardrailTripwireTriggered, Runner, set_default_openai_key, set_tracing_disabled
from app.config import settings
import json
import asyncio
import uuid
from typing import AsyncGenerator

from app.models.edit_documentation import (
    DocumentEditWithOriginal,
    EditDocumentationResponse,
    ChangeRequest,
    InLineEditAgentResponse,
    InLineEditGuardrailException,
)
from app.models.websocket_events import (
    EditProgressEvent,
    IntentDetectedEvent,
    SuggestionsFoundEvent,
    DocumentProcessingEvent,
    DocumentCompletedEvent,
    DocumentCreatedEvent,
    DocumentDeletedEvent,
    ErrorEvent,
    ProgressEvent,
)


class MainEditor:
    def __init__(self, query: str, document_id: str = None):
        self.query = query
        self.document_id: str = (
            document_id  # Initialize document_id to None, can be set later if needed
        )
        self.edit_changes: list[DocumentEdit] = []
        self.create_documents: list[GeneratedDocument] = []
        self.delete_documents: list[DocumentToDelete] = []

    async def run(self) -> "EditDocumentationResponse":
        """
        Detect user intents and dispatch the appropriate action handlers **concurrently**.
        All detected intents are scheduled as asyncio tasks so that edit, create, and delete
        operations run in parallel whenever possible.

        Returns
        -------
        EditDocumentationResponse
            Aggregated results from all handler tasks.
        """
        detected_intents = await self._detect_intent()

        # Map intent names to their corresponding handler coroutine factories.
        intent_handlers = {
            "edit": self._handle_edit_intent,
            "create": self._handle_create_intent,
            "delete": self._handle_delete_intent,
        }

        # Collect tasks for every detected intent.
        tasks: list[asyncio.Task] = []
        for intent in detected_intents.intents:
            print(f"Detected intent: {intent.intent} with reason: {intent.reason}")
            handler = intent_handlers.get(intent.intent)
            if handler is not None:
                # Schedule the handler concurrently.
                tasks.append(asyncio.create_task(handler(intent)))
            else:
                # Log or handle unexpected intents here if desired.
                print(f"⚠️  No handler found for intent '{intent.intent}'. Skipping.")

        # Await all handler tasks concurrently.
        if tasks:
            await asyncio.gather(*tasks)

        # Assemble and return the aggregated response object.
        return EditDocumentationResponse(
            edit=self.edit_changes,
            create=self.create_documents,
            delete=self.delete_documents,
        )

    async def run_with_streaming(self, session_id: str) -> AsyncGenerator[EditProgressEvent, None]:
        """
        Streaming version of run() that yields progress events as operations complete.
        """
        try:
            # Step 1: Detect intent
            yield ProgressEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={"message": "Detecting user intent...", "step": 1, "total_steps": 4}
            )
            
            detected_intents = await self._detect_intent()
            
            yield IntentDetectedEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload=detected_intents
            )
            
            # Step 2: Process each intent with streaming
            total_intents = len(detected_intents.intents)
            if total_intents == 0:
                yield ProgressEvent(
                    event_id=str(uuid.uuid4()),
                    session_id=session_id,
                    payload={"message": "No actionable intents detected", "step": 4, "total_steps": 4}
                )
                return
            
            # Map intent names to their corresponding streaming handler methods
            intent_handlers = {
                "edit": self._handle_edit_intent_streaming,
                "create": self._handle_create_intent_streaming,
                "delete": self._handle_delete_intent_streaming,
            }
            
            current_step = 2
            for i, intent in enumerate(detected_intents.intents):
                yield ProgressEvent(
                    event_id=str(uuid.uuid4()),
                    session_id=session_id,
                    payload={
                        "message": f"Processing {intent.intent} intent ({i+1}/{total_intents})",
                        "step": current_step,
                        "total_steps": 4
                    }
                )
                
                handler = intent_handlers.get(intent.intent)
                if handler is not None:
                    # Stream events from the handler
                    async for event in handler(intent, session_id):
                        yield event
                else:
                    yield ErrorEvent(
                        event_id=str(uuid.uuid4()),
                        session_id=session_id,
                        payload={
                            "message": f"No handler found for intent '{intent.intent}'",
                            "error_type": "UnknownIntent"
                        }
                    )
                
                current_step += 1
            
            # Step 4: Final progress
            yield ProgressEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": "All operations completed",
                    "step": 4,
                    "total_steps": 4
                }
            )
            
        except asyncio.CancelledError:
            yield ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": "Operation was cancelled",
                    "error_type": "CancelledError"
                }
            )
            raise
        except Exception as e:
            yield ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": str(e),
                    "error_type": type(e).__name__
                }
            )

    async def _handle_edit_intent(self, intent) -> None:
        """
        Handle edit intent by running edit suggestion agent and processing suggestions.
        """
        # Get edit suggestions
        edit_suggestions = await self._get_edit_suggestions(intent)

        # Process suggestions if any exist
        if edit_suggestions.suggestions:
            all_changes = await self._process_edit_suggestions(
                edit_suggestions.suggestions
            )
            self.edit_changes.extend(all_changes)
            print(f"Total edit changes collected: {len(all_changes)}")

    async def _handle_create_intent(self, intent) -> None:
        """
        Handle create intent by running create content agent.
        """
        create_content_agent_response = await Runner.run(
            create_content_agent,
            f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Create new documentation based on the task",
        )
        created_documents = create_content_agent_response.final_output_as(
            CreateContentResponse
        )
        print("Create Content Agent Response:")
        print(created_documents.model_dump_json(indent=2))

        # Add the generated documents to the output
        self.create_documents.extend(created_documents.documents)

    async def _handle_delete_intent(self, intent) -> None:
        """
        Handle delete intent by running delete content agent.
        """
        delete_content_agent_response = await Runner.run(
            delete_content_agent,
            f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Identify documents to delete based on the task",
        )
        delete_response = delete_content_agent_response.final_output_as(
            DeleteContentResponse
        )

        if delete_response.documents_to_delete:
            self.delete_documents.extend(delete_response.documents_to_delete)
            print(f"Documents to delete: {len(delete_response.documents_to_delete)}")
        else:
            print("No documents identified for deletion.")

    async def _get_edit_suggestions(self, intent) -> EditAgentResponse:
        """
        Get edit suggestions from the edit suggestion agent.
        Runs two agents concurrently - one with API reference context and one without.
        """
        query_text = f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Provide edit suggestions for the documentation based on the task"

        # Run two agents concurrently
        api_ref_task = Runner.run(
            edit_suggestion_agent, query_text, context=ApiRef(is_api_ref=True)
        )
        non_api_ref_task = Runner.run(
            edit_suggestion_agent, query_text, context=ApiRef(is_api_ref=False)
        )

        # Await both tasks concurrently
        api_ref_response, non_api_ref_response = await asyncio.gather(
            api_ref_task, non_api_ref_task
        )

        # Parse both responses
        api_ref_suggestions = api_ref_response.final_output_as(EditAgentResponse)
        print("API Reference Suggestions:")
        print(api_ref_suggestions.model_dump_json(indent=2))
        non_api_ref_suggestions = non_api_ref_response.final_output_as(
            EditAgentResponse
        )
        print("Non-API Reference Suggestions:")
        print(non_api_ref_suggestions.model_dump_json(indent=2))

        # Combine suggestions from both agents
        combined_suggestions = EditAgentResponse(
            suggestions=api_ref_suggestions.suggestions
            + non_api_ref_suggestions.suggestions
        )

        return combined_suggestions

    async def _process_edit_suggestions(self, suggestions) -> list[DocumentEdit]:
        """
        Process edit suggestions concurrently and return all changes.
        """
        # Create async tasks for each suggestion
        tasks = []
        for suggestion in suggestions:
            task_input = json.dumps({"suggestions": [suggestion.model_dump()]})
            task = Runner.run(edit_content_agent, task_input)
            tasks.append(task)

        # Run all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect all successful changes
        all_changes = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Error processing suggestion {i}: {str(result)}")
            else:
                try:
                    documents_edits = result.final_output_as(Edits)
                    changes = documents_edits.changes
                    all_changes.extend(changes)
                    print(f"Processed suggestion {i}: {len(changes)} document(s)")
                except Exception as e:
                    print(f"Error parsing result for suggestion {i}: {str(e)}")

        return all_changes

    async def _detect_intent(self) -> Detected_Intent:
        """
        Detect the intent from the user's query.
        """
        if self.document_id:
            query = f"Detect intent for query: {self.query} only for document ID: {self.document_id}"
        else:
            query = f"Detect intent for query: {self.query}"
        response = await Runner.run(intent_agent, query)
        print(f"Detected intent: {response}")
        return response.final_output_as(Detected_Intent)

    async def _handle_edit_intent_streaming(self, intent, session_id: str) -> AsyncGenerator[EditProgressEvent, None]:
        """Streaming version of edit intent handler"""
        try:
            # Get edit suggestions
            edit_suggestions = await self._get_edit_suggestions(intent)
            
            yield SuggestionsFoundEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload=edit_suggestions
            )
            
            # Process suggestions if any exist
            if edit_suggestions.suggestions:
                total_suggestions = len(edit_suggestions.suggestions)
                
                for i, suggestion in enumerate(edit_suggestions.suggestions):
                    # Get document title from document ID
                    document_title = "Unknown"
                    try:
                        from app.core.repositories.document_repository import DocumentRepository
                        doc_repo = DocumentRepository()
                        doc = await doc_repo.get_document_by_id(suggestion.document_id)
                        document_title = doc.get("title", f"Document {suggestion.document_id[:8]}")
                    except Exception:
                        document_title = f"Document {suggestion.document_id[:8]}"
                    
                    yield DocumentProcessingEvent(
                        event_id=str(uuid.uuid4()),
                        session_id=session_id,
                        payload={
                            "suggestion_index": i + 1,
                            "total_suggestions": total_suggestions,
                            "document_title": document_title,
                            "document_path": suggestion.path,
                        }
                    )
                    
                    try:
                        # Process single suggestion
                        task_input = json.dumps({"suggestions": [suggestion.model_dump()]})
                        result = await Runner.run(edit_content_agent, task_input)
                        documents_edits = result.final_output_as(Edits)
                        changes = documents_edits.changes
                        
                        # Yield completed documents
                        for change in changes:
                            self.edit_changes.append(change)
                            yield DocumentCompletedEvent(
                                event_id=str(uuid.uuid4()),
                                session_id=session_id,
                                payload=change
                            )
                            
                    except Exception as e:
                        yield ErrorEvent(
                            event_id=str(uuid.uuid4()),
                            session_id=session_id,
                            payload={
                                "message": f"Error processing suggestion {i + 1}: {str(e)}",
                                "error_type": type(e).__name__
                            }
                        )
            
        except Exception as e:
            yield ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": f"Error in edit intent handler: {str(e)}",
                    "error_type": type(e).__name__
                }
            )

    async def _handle_create_intent_streaming(self, intent, session_id: str) -> AsyncGenerator[EditProgressEvent, None]:
        """Streaming version of create intent handler"""
        try:
            yield ProgressEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={"message": "Creating new documentation content..."}
            )
            
            create_content_agent_response = await Runner.run(
                create_content_agent,
                f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Create new documentation based on the task",
            )
            created_documents = create_content_agent_response.final_output_as(CreateContentResponse)
            
            # Yield created documents
            for doc in created_documents.documents:
                self.create_documents.append(doc)
                yield DocumentCreatedEvent(
                    event_id=str(uuid.uuid4()),
                    session_id=session_id,
                    payload=doc
                )
                
        except Exception as e:
            yield ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": f"Error in create intent handler: {str(e)}",
                    "error_type": type(e).__name__
                }
            )

    async def _handle_delete_intent_streaming(self, intent, session_id: str) -> AsyncGenerator[EditProgressEvent, None]:
        """Streaming version of delete intent handler"""
        try:
            yield ProgressEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={"message": "Identifying documents for deletion..."}
            )
            
            delete_content_agent_response = await Runner.run(
                delete_content_agent,
                f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Identify documents to delete based on the task",
            )
            delete_response = delete_content_agent_response.final_output_as(DeleteContentResponse)
            
            # Yield deleted documents
            if delete_response.documents_to_delete:
                for doc in delete_response.documents_to_delete:
                    self.delete_documents.append(doc)
                    yield DocumentDeletedEvent(
                        event_id=str(uuid.uuid4()),
                        session_id=session_id,
                        payload=doc
                    )
            else:
                yield ProgressEvent(
                    event_id=str(uuid.uuid4()),
                    session_id=session_id,
                    payload={"message": "No documents identified for deletion"}
                )
                
        except Exception as e:
            yield ErrorEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                payload={
                    "message": f"Error in delete intent handler: {str(e)}",
                    "error_type": type(e).__name__
                }
            )

class InlineEditor:
    

    def __init__(self, selected_text: str, query: str):
        """
        Initialize the inline editor with the selected text and instructions(query).
        :param selected_text: The text that has been selected for inline editing.
        :param instructions: Instructions for the inline editor.
        """
        self.selected_text = selected_text
        self.query = query

    async def run(self) -> InLineEditAgentResponse:
        """
        Run the inline editor to apply changes to the given text
        """
        prompt=f"""Apply the given instructions to the selected text:
## Instructions:
{self.query}
## Selected Text:
{self.selected_text}
        """
        try:
            inline_agent_response= await Runner.run(inline_edit_agent, prompt)
            response=inline_agent_response.final_output_as(
                InLineEditAgentResponse
            )
            print(f"Inline edit response: {response.model_dump_json(indent=2)}")
            return InLineEditAgentResponse(edited_text=response.edited_text)
        except InputGuardrailTripwireTriggered:
            raise InLineEditGuardrailException(
                message="System only supports queries requesting for edits. Please ensure your query is suitable for inline editing."
            )

                                

def update_markdown(document_to_edit: DocumentEditWithOriginal) -> str:
    """
    Update the content of a document based on the provided edit changes.
    This function is a placeholder for the actual implementation that would apply the edits.
    """
    original_md = (
        document_to_edit.original_content.markdown_content
        if document_to_edit.original_content
        else ""
    )
    for change in document_to_edit.changes:
        if change.old_string and change.new_string:
            original_md = original_md.replace(change.old_string, change.new_string, 1)
    return original_md
