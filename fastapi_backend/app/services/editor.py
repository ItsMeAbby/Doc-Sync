from app.services.agents.edit_suggestion_agent import EditAgentResponse, edit_suggestion_agent
from app.services.agents.editor_agent import edit_content_agent, Edits
from app.services.agents.intent_detection_agent import Detected_Intent, intent_agent

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
                    f"Suggest edits for the query: {self.query}"
                )
                edit_agent_suggestions = edit_suggestion_agent_response.final_output_as(EditAgentResponse)
                print("Edit Suggestions:")
                print(edit_agent_suggestions.model_dump_json(indent=2))
                edit_content_agent_response = await Runner.run(edit_content_agent,
                    edit_agent_suggestions.model_dump_json(indent=2)
                )
                documents_edits= edit_content_agent_response.final_output_as(Edits)
                print("Edit Content Agent Response:")
                print(documents_edits.model_dump_json(indent=2))
                dict_documents_edits = documents_edits.model_dump()
                self.output_chnages["edit"] = dict_documents_edits.get("changes", [])





            
        return self.output_chnages

        
        
    
    async def _detect_intent(self) -> Detected_Intent:
        """
        Detect the intent from the user's query.
        """
        response = await Runner.run(intent_agent, f"Detect intent for query: {self.query}")
        print(f"Detected intent: {response}")
        return response.final_output_as(Detected_Intent)