from typing import List, Optional
import sys
import os
from pydantic import BaseModel, Field
from typing_extensions import Literal
from app.supabase import supabase
import asyncio
from agents import function_tool
from app.config import settings
from app.services.tools.edit_suggesstion_tools import Document

class GetDocumentsForDeletionConfiguration(BaseModel):
    """Configuration for analyzing documents for deletion."""
    is_api_ref: Optional[bool] = False
    """Whether to filter for API reference documents."""

class DocumentsForDeletionResponse(BaseModel):
    """Response containing documents that could be candidates for deletion."""
    documents: Optional[List[Document]]
    """List of documents available for deletion analysis."""
    total_count: int
    """Total number of documents found."""

@function_tool
async def get_documents_for_deletion_analysis(
    config: GetDocumentsForDeletionConfiguration
) -> DocumentsForDeletionResponse:
    """
    Get all documents with metadata for deletion analysis.
    
    Returns:
        DocumentsForDeletionResponse: List of documents with metadata for analysis
    """
    try:
        query = (
            supabase.table("documents")
            .select("""
                *,
                document_contents:current_version_id (
                    version,
                    summary,
                    language,
                    urls_array
                )
            """)
            .eq("is_deleted", False)
            .eq("is_api_ref", config.is_api_ref)  # Filter by API reference if specified
        )
        response= query.execute()
        raw_docs = response.data
        documents = []
        for doc in raw_docs:
            content = doc.get("document_contents",{})
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
                        language= content.get("language"),
                        keywords_array=content.get("keywords_array", []),
                        urls_array=content.get("urls_array", []),
                        is_api_ref= doc.get("is_api_ref", False)
                    )
                )
        if not documents:
            return DocumentsForDeletionResponse(
                documents=[],
                total_count=0
            )
        return DocumentsForDeletionResponse(
            documents=documents,
            total_count=len(documents)
        )
    except Exception as e:
        return DocumentsForDeletionResponse(
            documents=[],
            total_count=0
        )
