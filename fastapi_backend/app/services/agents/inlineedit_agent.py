from typing import List, Optional
from agents import Runner, trace
from pydantic import BaseModel
from app.services.shared.base_agent import AgentFactory
from app.services.prompts import INLINE_EDIT_PROMPT
from app.models.edit_documentation import InLineEditAgentResponse
from app.services.guardrails.edit_guardrail import edit_guardrail_func



# Create the create content agent using the factory
inline_edit_agent_instance = AgentFactory.create_agent(
    name="InLineContentEditAgent",
    instructions=INLINE_EDIT_PROMPT,
    output_type=InLineEditAgentResponse,
    input_guardrails=[edit_guardrail_func]
)

# Get the underlying agent for backward compatibility
inline_edit_agent = inline_edit_agent_instance.get_agent()

if __name__ == "__main__":
    # Example usage
    async def main():
        with trace("CreateContentAgent"):
            response = await Runner.run(
                inline_edit_agent,
                """To authenticate with the OpenAI Agents SDK, you typically use your OpenAI API key, either by setting it as an environment variable (`OPENAI_API_KEY`) or by passing it directly to the `OpenAI()` client in your code. Once authenticated, you can create and interact with assistants and tools through the SDK. For secure production use, it's best to manage the API key via environment variables or a secrets manager. If your agents need access to external APIs (like Supabase), you'll also need to handle those authentications separately within your custom tools or function calls.

In addition, we’ve introduced a new hypothetical method called `client.authenticate_agent_session()`, designed to streamline per-session authentication for agents interacting with protected third-party services. This method accepts the following parameters:

* `agent_id` *(str)*: The unique identifier of the agent requiring session-based access.
* `session_token` *(str)*: A temporary or refreshable token used to authenticate the agent for the current session.
* `expires_in` *(int, optional)*: Time in seconds until the session expires (default is 3600 seconds).

This method ensures that each agent can securely assume session-based roles when accessing external systems or APIs without embedding long-lived credentials, improving security and access control across distributed applications.
""",
            )
            result = response.final_output_as(InLineEditAgentResponse)
            print("Generated Documents:")
            print(result.model_dump_json(indent=2))

    import asyncio

    asyncio.run(main())
