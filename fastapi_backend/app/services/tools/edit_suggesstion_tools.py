from dataclasses import dataclass
from typing import List, Optional
import sys
import os

# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from pydantic import BaseModel, Field
from typing_extensions import Literal
from app.services.openai_service import create_embedding
from app.services.shared.models import ApiRef
from app.supabase import supabase
import asyncio
from agents import RunContextWrapper, function_tool, Agent

from app.config import settings


class Document(BaseModel):
    id: str
    title: Optional[str]
    version: str
    markdown_content: Optional[str]
    summary: Optional[str]
    similarity: Optional[float]
    path: str
    language: str
    keywords_array: Optional[List[str]]
    urls_array: Optional[List[str]]
    is_api_ref: bool


class SimilarDocumentsResponse(BaseModel):
    documents: Optional[List[Document]]


class EmbeddingsConfiguration(BaseModel):
    query: str
    language: Literal["en", "ja"] = "en"
    is_api_ref: bool = False
    top_k: int = 5


class AllDocumentsConfiguration(BaseModel):
    is_api_ref: bool = False


class FetchDocumentConfiguration(BaseModel):
    document_id: str
    version: str


@function_tool
async def get_similar_documents_based_on_embeddings(
    config: EmbeddingsConfiguration,
) -> SimilarDocumentsResponse:
    """
    This tool retrieves similar documents based on the provided query using embeddings.
    Args:
        config (EmbeddingsConfiguration): Configuration for the similarity search.
            query (str): The search query to find similar documents.
            language (Literal["en", "ja"]): The language of the documents to search in. Defaults to "en".
            is_api_ref (bool): If True, only API reference documents are considered. Defaults to False.
            top_k (int): The number of top similar documents to return. Defaults to 5.
    Returns:
        SimilarDocumentsResponse: A response containing a list of similar documents.
        SimilarDocumentsResponse will be empty if no documents are found.
        Document contains the following fields:
            - id: The unique identifier of the document.
            - title: The title of the document.
            - version: The latest version id of the document.
            - markdown_content: The content of the document in markdown format.
            - summary: A summary of the document.
            - similarity: The similarity score of the document to the query.
            - path: The path of document in the document tree.
            - language: The language of the document.
            - keywords_array: An array of keywords associated with the document.
            - urls_array: An array of URLs associated with the document.
    Raises:
        Exception: If there is an error executing the similarity search.
    """
    query_embeddings = await create_embedding(config.query)
    if query_embeddings is None:
        return SimilarDocumentsResponse(documents=[])

    response = supabase.rpc(
        "execute_similarity_search",
        {
            "query_embedding": query_embeddings,
            "lang": config.language,
            "api_ref": config.is_api_ref,
            "top_k": config.top_k,
        },
    ).execute()

    documents = response.data
    if not documents:
        return SimilarDocumentsResponse(documents=[])
    return SimilarDocumentsResponse(documents=documents)


@function_tool
async def get_all_document_summaries(
    wrapper: RunContextWrapper[ApiRef],
) -> SimilarDocumentsResponse:
    """
    This tool retrieves all documents summaries and metadata.
    Args:
        None
    Returns:
        SimilarDocumentsResponse: A response containing a list of similar documents.
        SimilarDocumentsResponse will be empty if no documents are found.
        Document contains the following fields:
            - id: The unique identifier of the document.
            - title: The title of the document.
            - version: The latest version id of the document.
            - markdown_content: The content of the document in markdown format.
            - summary: A summary of the document.
            - similarity: The similarity score of the document to the query.
            - path: The path of document in the document tree.
            - language: The language of the document.
            - keywords_array: An array of keywords associated with the document.
            - urls_array: An array of URLs associated with the document.
    Raises:
        Exception: If there is an error executing the getting all document summaries.
    """
    # get all documents
    print(
        "Fetching all documents summaries for is_api_ref:", wrapper.context.is_api_ref
    )
    query = (
        supabase.table("documents")
        .select(
            """
                *,
                document_contents:current_version_id (
                    version,
                    summary,
                    language,
                    keywords_array,
                    urls_array
                )
            """
        )
        .eq("is_deleted", False)
        .eq(
            "is_api_ref", wrapper.context.is_api_ref
        )  # Filter by API reference if specified
        .order("created_at", desc=True)
        .not_.is_("current_version_id", None)
    )
    response = query.execute()
    raw_docs = response.data
    documents = []
    for doc in raw_docs:
        content = doc.get("document_contents", {})
        if not content:
            continue
        documents.append(
            Document(
                id=doc["id"],
                title=doc.get("title"),
                version=content.get("version", ""),
                markdown_content=None,  # Assuming markdown_content is not needed here
                summary=content.get("summary", ""),
                similarity=None,  # No similarity score for all documents
                path=doc.get("path", ""),
                language=content.get("language", "en"),
                keywords_array=content.get("keywords_array", []),
                urls_array=content.get("urls_array", []),
                is_api_ref=doc.get("is_api_ref", False),
            )
        )
    if not documents:
        return SimilarDocumentsResponse(documents=[])
    return SimilarDocumentsResponse(documents=documents)


@function_tool
async def get_document_by_version(config: FetchDocumentConfiguration) -> Document:
    """
    This tool retrieves a specific version of a document by its ID and version.
    Args:
        document_id (str): The unique identifier of the document.
        version (str): The version of the document to retrieve.
    Returns:
        Document: A document object containing the details of the specified version.
        Document contains the following fields:
            - id: The unique identifier of the document.
            - title: The title of the document.
            - version: The version of the document.
            - markdown_content: The content of the document in markdown format.
            - summary: A summary of the document.
            - similarity: The similarity score of the document to the query (not applicable here).
            - path: The path of the document in the document tree.
            - language: The language of the document.
            - keywords_array: An array of keywords associated with the document.
            - urls_array: An array of URLs associated with the document.
            - is_api_ref: A boolean indicating if the document is an API reference.
    Raises:
        Exception: If there is an error executing the retrieval of the document.
    """
    document_id = config.document_id
    version = config.version
    response = (
        supabase.table("documents")
        .select(
            """
                *,
                document_contents:current_version_id (
                    version,
                    summary,
                    language,
                    keywords_array,
                    urls_array,
                    markdown_content
                )
            """
        )
        .eq("id", document_id)
        .eq("current_version_id", version)
        .eq("is_deleted", False)
        .single()
    )
    result = response.execute()
    if not result.data:
        raise Exception(
            f"Document with ID {document_id} and version {version} not found."
        )
    doc = result.data
    content = doc.get("document_contents", {})
    if not content:
        raise Exception(
            f"Document content for ID {document_id} and version {version} not found."
        )
    return Document(
        id=doc["id"],
        title=doc.get("title"),
        version=content.get("version", ""),
        markdown_content=content.get("markdown_content", ""),
        summary=content.get("summary", ""),
        similarity=None,  # No similarity score for specific document retrieval
        path=doc.get("path", ""),
        language=content.get("language", "en"),
        keywords_array=content.get("keywords_array", []),
        urls_array=content.get("urls_array", []),
        is_api_ref=doc.get("is_api_ref", False),
    )


if __name__ == "__main__":
    # Example usage
    async def main():
        response = await get_document_by_version(
            FetchDocumentConfiguration(
                document_id="d123c732-7f44-4cf0-aafb-13c5bb160bc6",
                version="8e83d392-da47-49eb-8bc8-27a1130e40c7",
            )
        )
        print(response.model_dump_json(indent=2))

    asyncio.run(main())
