from typing import List, Optional
from agents import Runner, trace
from pydantic import BaseModel
from app.services.shared.base_agent import AgentFactory
from app.services.prompts import INLINE_EDIT_PROMPT
from app.models.edit_documentation import EditGuardrailResponse 

from pydantic import BaseModel
from agents import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    RunContextWrapper,
    Runner,
    TResponseInputItem,
    input_guardrail,
)

# Create the create content agent using the factory
edit_guardrail_agent_instance = AgentFactory.create_agent(
    name="Edit Guardrail Check",
    instructions="Check if the user is asking for other thing like question instead of editing the text",
    output_type=EditGuardrailResponse,
)
edit_guardrail_agent= edit_guardrail_agent_instance.get_agent()
  
@input_guardrail
async def edit_guardrail_func( 
    ctx: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(edit_guardrail_agent, input, context=ctx.context)

    return GuardrailFunctionOutput(
        output_info=result.final_output, 
        tripwire_triggered=result.final_output.not_edit_request,
    )