from app.services.agents.intent_detection_agent import Detected_Intent, intent_agent
from agents import Runner
class MainEditor:
    def __init__(self, query: str):
        self.query = query

    async def run(self):
        """
        Run the agent to get the response based on the query.
        """
        intent= await self._detect_intent()
        
    
    async def _detect_intent(self) -> Detected_Intent:
        """
        Detect the intent from the user's query.
        """
        response = await Runner.run(intent_agent, f"Detect intent for query: {self.query}")
        print(f"Detected intent: {response}")
        return response.final_output_as(Detected_Intent)