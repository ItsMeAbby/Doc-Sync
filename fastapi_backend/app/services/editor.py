from app.services.agents.edit_suggestion_agent import EditAgentResponse, edit_suggestion_agent
from app.services.agents.editor_agent import DocumentEdit, edit_content_agent, Edits
from app.services.agents.intent_detection_agent import Detected_Intent, intent_agent
from app.services.agents.create_content_agent import CreateContentResponse, GeneratedDocument, create_content_agent
from agents import Runner,set_default_openai_key,set_tracing_disabled
from app.config import settings
import json
import asyncio

from app.models.edit_documentation import DocumentEditWithOriginal, EditDocumentationResponse, ChangeRequest
class MainEditor:
    def __init__(self, query: str):
        self.query = query
        self.edit_changes: list[DocumentEdit] = []
        self.create_documents: list[GeneratedDocument] = []

    async def run(self) -> EditDocumentationResponse:
        """
        Run the agent to get the response based on the query.
        """
        detected_intents = await self._detect_intent()
        
        for intent in detected_intents.intents:
            print(f"Detected intent: {intent.intent} with reason: {intent.reason}")
            
            if intent.intent == "edit":
                await self._handle_edit_intent(intent)
            elif intent.intent == "create":
                await self._handle_create_intent(intent)
        
        return EditDocumentationResponse(
            edit=self.edit_changes,
            create=self.create_documents
        )

    async def _handle_edit_intent(self, intent) -> None:
        """
        Handle edit intent by running edit suggestion agent and processing suggestions.
        """
        # Get edit suggestions
        edit_suggestions = await self._get_edit_suggestions(intent)
        
        # Process suggestions if any exist
        if edit_suggestions.suggestions:
            all_changes = await self._process_edit_suggestions(edit_suggestions.suggestions)
            self.edit_changes.extend(all_changes)
            print(f"Total edit changes collected: {len(all_changes)}")
    
    async def _handle_create_intent(self, intent) -> None:
        """
        Handle create intent by running create content agent.
        """
        create_content_agent_response = await Runner.run(create_content_agent,
            f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Create new documentation based on the task"
        )
        created_documents = create_content_agent_response.final_output_as(CreateContentResponse)
        print("Create Content Agent Response:")
        print(created_documents.model_dump_json(indent=2))
        
        # Add the generated documents to the output
        self.create_documents.extend(created_documents.documents)
    
    async def _get_edit_suggestions(self, intent) -> EditAgentResponse:
        """
        Get edit suggestions from the edit suggestion agent.
        """
        edit_suggestion_agent_response = await Runner.run(edit_suggestion_agent,
            f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Provide edit suggestions for the documentation based on the task"
        )
        edit_agent_suggestions = edit_suggestion_agent_response.final_output_as(EditAgentResponse)
        return edit_agent_suggestions
    
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
        response = await Runner.run(intent_agent, f"Detect intent for query: {self.query}")
        print(f"Detected intent: {response}")
        return response.final_output_as(Detected_Intent)


def update_markdown(document_to_edit:DocumentEditWithOriginal ) -> str:
    """
    Update the content of a document based on the provided edit changes.
    This function is a placeholder for the actual implementation that would apply the edits.
    """
    original_md= document_to_edit.original_content.markdown_content if document_to_edit.original_content else ""
    for change in document_to_edit.changes:
        if change.old_string and change.new_string:
            original_md = original_md.replace(change.old_string, change.new_string, 1)
    return original_md
