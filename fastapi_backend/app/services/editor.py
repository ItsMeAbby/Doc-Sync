from app.services.agents.edit_suggestion_agent import EditAgentResponse, edit_suggestion_agent
from app.services.agents.editor_agent import edit_content_agent, Edits
from app.services.agents.intent_detection_agent import Detected_Intent, intent_agent
from app.services.agents.create_content_agent import CreateContentResponse, create_content_agent
import json
import asyncio

from agents import Runner
class MainEditor:
    def __init__(self, query: str):
        self.query = query
        self.output_chnages={}

    async def run(self):
        """
        Run the agent to get the response based on the query.
        """
        detected_intents= await self._detect_intent()
        for intent in detected_intents.intents:
            print(f"Detected intent: {intent.intent} with reason: {intent.reason}")
            if intent.intent == "edit":
                # If the intent is to edit, we can run the edit suggestion agent
                edit_suggestion_agent_response = await Runner.run(edit_suggestion_agent,
                    f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Provide edit suggestions for the documentation based on the task"
                )
                edit_agent_suggestions = edit_suggestion_agent_response.final_output_as(EditAgentResponse)
                print("Edit Suggestions:")
                print(edit_agent_suggestions.model_dump_json(indent=2))
                
                # Process each suggestion asynchronously
                suggestions = edit_agent_suggestions.suggestions
                if suggestions:
                    # Create async tasks for each suggestion
                    tasks = []
                    for suggestion in suggestions:
                        # Create a task for each individual suggestion
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
                                changes = documents_edits.model_dump().get("changes", [])
                                all_changes.extend(changes)
                                print(f"Processed suggestion {i}: {len(changes)} document(s)")
                            except Exception as e:
                                print(f"Error parsing result for suggestion {i}: {str(e)}")
                    
                    self.output_chnages["edit"] = all_changes
                    print(f"Total edit changes collected: {len(all_changes)}")
                else:
                    self.output_chnages["edit"] = []
            
            elif intent.intent == "create":
                # If the intent is to create, run the create content agent directly
                create_content_agent_response = await Runner.run(create_content_agent,
                    f"User query: {self.query} Task: {intent.task} Reason: {intent.reason}. Create new documentation based on the task"
                )
                created_documents = create_content_agent_response.final_output_as(CreateContentResponse)
                print("Create Content Agent Response:")
                print(created_documents.model_dump_json(indent=2))
                
                # Add the generated documents to the output
                dict_created_documents = created_documents.model_dump()
                self.output_chnages["create"] = dict_created_documents




            
        return self.output_chnages

        
        
    
    async def _detect_intent(self) -> Detected_Intent:
        """
        Detect the intent from the user's query.
        """
        response = await Runner.run(intent_agent, f"Detect intent for query: {self.query}")
        print(f"Detected intent: {response}")
        return response.final_output_as(Detected_Intent)