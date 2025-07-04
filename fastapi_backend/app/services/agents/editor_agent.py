import json
from agents import Runner, trace
from app.services.shared.models import ContentChange, DocumentEdit, Edits
from app.services.shared.base_agent import AgentFactory
from app.services.prompts import CONTENT_EDIT_PROMPT
from app.services.tools.edit_suggesstion_tools import get_document_by_version

# Create the edit content agent using the factory
edit_content_agent_instance = AgentFactory.create_agent(
    name="ContentEditAgent",
    instructions=CONTENT_EDIT_PROMPT,
    output_type=Edits,
    tools=[get_document_by_version],
)

# Get the underlying agent for backward compatibility
edit_content_agent = edit_content_agent_instance.get_agent()
if __name__ == "__main__":
    # Example usage
    async def main():
        with trace("Editor"):
            # Run the edit agent with a sample query
            # The query should be related to editing a document
            # For example, "We don't support agents as_tool anymore, other agents should only be invoked via handoff"
            response = await Runner.run(
                edit_content_agent,
                json.dumps(
                    {
                        "suggestions": [
                            {
                                "document_id": "c7a64bcd-6818-4046-90ca-3e8bcb60b9b7",
                                "changes": 'Replace any mention or example describing use of `Agent` as a tool using `as_tool` or similar mechanisms with language stating this feature is no longer supported. Add clear instruction: "Direct use of agents as tools is deprecated. To invoke another agent, use a handoff instead."\n\nReview sample code and guidance to eliminate agent-as-tool patterns, and update with examples using `handoff` for agent delegation.\n\nAlso ensure the section on configuring agents and tools describes that agent handoffs must use the handoff mechanism, and not tool invocation.',
                                "version": "601ab755-7751-4d97-8318-e3b4f821f209",
                                "is_api_ref": True,
                                "path": "agent/",
                            },
                            {
                                "document_id": "ad2b96f9-2986-46be-e5a8-482e-bb0d-6411d271f86a",
                                "changes": 'Replace any guidance or example which describes agents as tools, including via `as_tool`, with a statement explaining: "Agents can no longer be used as tools (as_tool is deprecated). If you want to invoke another agent, use a handoff." \n\nUpdate any example code or workflow description accordingly—removing agent-as-tool patterns and demonstrating use of handoffs.\n\nAdd a note in the section covering agent orchestration/tooling that only handoff is supported for agent-to-agent delegation.',
                                "version": "c743312a-e5a8-482e-bb0d-6411d271f86a",
                                "is_api_ref": False,
                                "path": "agents/",
                            },
                            {
                                "document_id": "711a9ea9-d76a-4f67-98f4-4eee1e62e3c8",
                                "changes": 'Replace or remove text and code that demonstrates or refers to using agents as tools (for example, by wrapping agents with tool decorators or through an `as_tool` mechanism). Add explicit guidance: "Using agents as tools is no longer supported. Only handoff is supported for invoking other agents."\n\nUpdate overview text to clarify that for agent-to-agent coordination, the correct mechanism is handoff via the `handoff` feature, not tool invocation.',
                                "version": "3c294470-2ad6-4afa-b15e-4eee1e62e3c8",
                                "is_api_ref": False,
                                "path": "tools/",
                            },
                            {
                                "document_id": "e76358db-8837-4715-9488-a139bf680536",
                                "changes": 'Remove or rewrite any mention of setting up an agent as a tool using `as_tool` or related decorators, replacing it with a warning: "Agents cannot be invoked as tools; use handoff for transferring control or tasks between agents."\n\nIn any relevant setup, patterns, or code snippets, switch to showing agent handoff usage instead of agent-as-tool usage.',
                                "version": "05514707-3bc2-4298-a4c9-129a303ae2a2",
                                "is_api_ref": False,
                                "path": "tools/",
                            },
                        ]
                    }
                ),
            )
            print(response.raw_responses)
            out = response.final_output_as(Edits)
            print("Edit Suggestions:")
            print(out.model_dump_json(indent=2))

    import asyncio

    asyncio.run(main())
