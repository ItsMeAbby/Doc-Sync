from typing import List, Optional
import sys
import os
from pydantic import BaseModel, Field
from typing_extensions import Literal
from app.supabase import supabase
import asyncio
from agents import function_tool
from app.config import settings

class GetAllPathsConfiguration(BaseModel):
    is_api_ref: bool = False

class DocumentPath(BaseModel):
    id: str
    path: str
    name: str
    title: Optional[str]

class AllPathsResponse(BaseModel):
    paths: List[DocumentPath]

@function_tool
async def get_all_document_paths(
    config: GetAllPathsConfiguration
) -> AllPathsResponse:
    """
    Get all document paths to check what already exists.
    
    Args:
        config (GetAllPathsConfiguration): Configuration containing:
            - is_api_ref (bool): Whether to get API reference documents
    
    Returns:
        AllPathsResponse: List of all document paths
    """
    try:
        # Query for all documents with their paths
        query = (
            supabase.table("documents")
            .select("id, path, name, title")
            .eq("is_deleted", False)
            .eq("is_api_ref", config.is_api_ref)
        )
        
        result = query.execute()
        
        paths = []
        for doc in result.data:
            paths.append(DocumentPath(
                id=doc["id"],
                path=doc["path"],
                name=doc["name"],
                title=doc.get("title")
            ))
        
        return AllPathsResponse(paths=paths)
    except Exception as e:
        return AllPathsResponse(paths=[])