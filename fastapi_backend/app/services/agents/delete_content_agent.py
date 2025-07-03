from typing import List, Optional
from typing_extensions import Literal
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from agents import Agent, Runner, trace
from app.config import settings
from app.services.prompts import DELETE_CONTENT_PROMPT
from app.services.tools.delete_tools import get_documents_for_deletion_analysis

class DocumentToDelete(BaseModel):
    """
    Represents a document identified for deletion.
    """
    document_id: str
    """The unique identifier of the document."""
    title: str
    """The title of the document."""
    path: str
    """The path of the document in the documentation tree."""
    version: str
    """The version id of the document."""

class DeleteContentResponse(BaseModel):
    """
    Response from the Delete Content Agent.
    """
    documents_to_delete: List[DocumentToDelete]
    """List of documents identified for deletion."""
    error: Optional[str] = None
    """Error message if something went wrong."""

delete_content_agent = Agent(
    name="DeleteContentAgent",
    instructions=DELETE_CONTENT_PROMPT,
    model=settings.OPENAI_MODEL,
    output_type=DeleteContentResponse,
    tools=[get_documents_for_deletion_analysis]
)

if __name__ == "__main__":
    # Example usage
    async def main():
        with trace("DeleteContentAgent"):
            response = await Runner.run(delete_content_agent,
                "Delete the agents page"
            )
            result = response.final_output_as(DeleteContentResponse)
            print("Documents to Delete:")
            print(result.model_dump_json(indent=2))

    import asyncio
    asyncio.run(main())