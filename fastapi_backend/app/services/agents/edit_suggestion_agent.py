from typing import List
from typing_extensions import Literal
from pydantic import BaseModel
import sys
import os

from app.services.shared.models import ApiRef

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from agents import Agent, Runner, trace
from app.config import settings
from app.services.prompts import EDIT_SUGGESTION_PROMPT
from app.services.tools.edit_suggesstion_tools import (
    get_all_document_summaries,
    get_document_by_version,
)
from dataclasses import dataclass


class EditSuggestion(BaseModel):
    """
    Represents a suggested edit to a document.
    """

    document_id: str
    """The ID of the document to be edited."""
    changes: str
    """Use clear, detailed. specific instructions for each type of edit:
        - **Add content**: 'Add the following text after [specific location/heading]: [exact text to add]'
        - **Remove content**: 'Remove the following text: [exact text to remove]'
        - **Modify content**: 'Replace the text [exact original text] with [exact replacement text]'
        - **Update sections**: 'Update the [specific section name] section to reflect: [specific changes]'
    """
    version: str
    """The version of the document to be edited."""
    is_api_ref: bool = False
    """Indicates if the document is an API reference document."""
    path: str
    """The path to the document."""


class EditAgentResponse(BaseModel):
    """
    Represents the response from the Edit Agent.
    """

    suggestions: list[EditSuggestion]
    """List of suggested edits to be made to the document."""


edit_suggestion_agent = Agent[ApiRef](
    name="EditSuggestionAgent",
    instructions=EDIT_SUGGESTION_PROMPT,
    model=settings.OPENAI_MODEL,
    tools=[get_all_document_summaries, get_document_by_version],
    output_type=EditAgentResponse,
)

if __name__ == "__main__":
    # Example usage
    async def main():
        with trace("EditSuggestionAgent"):
            # Run the edit agent with a sample query
            # The query should be related to editing a document
            # For example, "We don't support agents as_tool anymore, other agents should only be invoked via handoff"
            response = await Runner.run(
                edit_suggestion_agent,
                "We don't support agents as_tool anymore, other agents should only be invoked via handoff",
            )
            # print(response.raw_responses)
            print(response)

    import asyncio

    asyncio.run(main())
