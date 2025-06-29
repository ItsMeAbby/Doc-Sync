from typing_extensions import Literal
from pydantic import BaseModel

from agents import Agent

from app.services.prompts import INTENT_PROMPT

# based on user query, you identify what typemof edir user wants to do
#  doe suser want to create a new document, delete a document, or edit an existing one, or move a document
class Intent_Item(BaseModel):
    reason: str
    """Your reasoning for why this intent was detected."""
    intent: Literal["edit", "create", "delete", "move"]
    """The detected intent based on the user's query."""

class Detected_Intent(BaseModel):
    """
    Represents the detected intent from the user's query.
    """
    intents: list[Intent_Item]
    """List of detected intents with reasoning."""
intent_agent=Agent(
    name="IntentDetectionAgent",
    instructions=INTENT_PROMPT,
    model="gpt-4.1",
    output_type=Detected_Intent
)
