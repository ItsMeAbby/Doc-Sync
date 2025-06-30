from typing import List, Optional
from typing_extensions import Literal
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from agents import Agent, Runner, trace
from app.config import settings
from app.services.prompts import CREATE_CONTENT_PROMPT
from app.services.tools.create_tools import get_all_document_paths

class GeneratedDocument(BaseModel):
    """
    Represents a generated document (not saved to database).
    """
    name: str
    """The name of the document (filename without extension)."""
    path: str
    """The path where the document should be created."""
    title: str
    """The display title of the document."""
    parent_id: Optional[str] = None
    """The ID of the parent document (None for root level)."""
    is_api_ref: bool = False
    """Whether this is an API reference document."""
    markdown_content_en: str
    """The generated markdown content."""
    markdown_content_ja: str
    """The generated markdown content in Japanese."""

class CreateContentResponse(BaseModel):
    """
    Response from the Create Content Agent.
    """
    documents: List[GeneratedDocument]
    """List of generated documents (not saved to database)."""
    error: Optional[str] = None
    """Error message if something went wrong."""

create_content_agent = Agent(
    name="CreateContentAgent",
    instructions=CREATE_CONTENT_PROMPT,
    model=settings.OPENAI_MODEL,
    output_type=CreateContentResponse,
    tools=[get_all_document_paths]
)

if __name__ == "__main__":
    # Example usage
    async def main():
        with trace("CreateContentAgent"):
            response = await Runner.run(create_content_agent,
                """To authenticate with the OpenAI Agents SDK, you typically use your OpenAI API key, either by setting it as an environment variable (`OPENAI_API_KEY`) or by passing it directly to the `OpenAI()` client in your code. Once authenticated, you can create and interact with assistants and tools through the SDK. For secure production use, it's best to manage the API key via environment variables or a secrets manager. If your agents need access to external APIs (like Supabase), you'll also need to handle those authentications separately within your custom tools or function calls.

In addition, we’ve introduced a new hypothetical method called `client.authenticate_agent_session()`, designed to streamline per-session authentication for agents interacting with protected third-party services. This method accepts the following parameters:

* `agent_id` *(str)*: The unique identifier of the agent requiring session-based access.
* `session_token` *(str)*: A temporary or refreshable token used to authenticate the agent for the current session.
* `expires_in` *(int, optional)*: Time in seconds until the session expires (default is 3600 seconds).
* `scopes` *(list\[str], optional)*: A list of permission scopes granted during the session (e.g., `["read", "write"]`).

This method ensures that each agent can securely assume session-based roles when accessing external systems or APIs without embedding long-lived credentials, improving security and access control across distributed applications.
"""
            )
            result = response.final_output_as(CreateContentResponse)
            print("Generated Documents:")
            print(result.model_dump_json(indent=2))

    import asyncio
    asyncio.run(main())