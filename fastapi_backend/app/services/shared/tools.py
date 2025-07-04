from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from agents import function_tool
from app.supabase import supabase
from app.services.openai_service import create_embedding
from app.config import settings


class Document(BaseModel):
    """Unified document model for all tools"""
    id: str
    title: Optional[str] = None
    version: Optional[str] = None
    markdown_content: Optional[str] = None
    summary: Optional[str] = None
    similarity: Optional[float] = None
    path: Optional[str] = None
    name: Optional[str] = None
    language: Optional[str] = None
    keywords_array: Optional[List[str]] = None
    urls_array: Optional[List[str]] = None
    is_api_ref: bool = False


class DocumentPath(BaseModel):
    """Document path information"""
    id: str
    path: str
    name: str
    title: Optional[str] = None


class ToolResponse(BaseModel):
    """Base response model for all tools"""
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None


class DocumentListResponse(ToolResponse):
    """Response containing a list of documents"""
    documents: Optional[List[Document]] = None


class PathListResponse(ToolResponse):
    """Response containing a list of document paths"""
    paths: Optional[List[DocumentPath]] = None


class DocumentDetailResponse(ToolResponse):
    """Response containing a single document with details"""
    document: Optional[Document] = None


class DatabaseTool:
    """Consolidated database operations for all agents"""
    
    @staticmethod
    async def get_document_by_version(document_id: str, version: str) -> Document:
        """Get a specific document version"""
        try:
            # Get document metadata
            doc_result = supabase.table("documents").select("*").eq("id", document_id).execute()
            if not doc_result.data:
                raise ValueError(f"Document {document_id} not found")
            
            doc_metadata = doc_result.data[0]
            
            # Get content for specific version
            content_result = supabase.table("document_contents").select("*").eq(
                "document_id", document_id
            ).eq("version", version).execute()
            
            if not content_result.data:
                raise ValueError(f"Version {version} not found for document {document_id}")
            
            content = content_result.data[0]
            
            return Document(
                id=document_id,
                title=doc_metadata.get("title"),
                version=version,
                markdown_content=content.get("markdown_content"),
                summary=content.get("summary"),
                path=doc_metadata.get("path"),
                name=doc_metadata.get("name"),
                language=content.get("language"),
                keywords_array=content.get("keywords_array", []),
                urls_array=content.get("urls_array", []),
                is_api_ref=doc_metadata.get("is_api_ref", False)
            )
        except Exception as e:
            raise ValueError(f"Error fetching document: {str(e)}")
    
    @staticmethod
    async def get_all_document_paths(is_api_ref: bool = False) -> List[DocumentPath]:
        """Get all document paths"""
        try:
            result = supabase.table("documents").select("id, path, name, title").eq(
                "is_api_ref", is_api_ref
            ).eq("is_deleted", False).execute()
            
            return [
                DocumentPath(
                    id=doc["id"],
                    path=doc.get("path", ""),
                    name=doc.get("name", ""),
                    title=doc.get("title")
                )
                for doc in result.data
            ]
        except Exception as e:
            raise ValueError(f"Error fetching document paths: {str(e)}")
    
    @staticmethod
    async def search_similar_documents(query: str, limit: int = 10) -> List[Document]:
        """Search for similar documents using embeddings"""
        try:
            # Create embedding for the query
            query_embedding = await create_embedding(query)
            
            # Search for similar documents
            result = supabase.rpc(
                "search_documents",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.78,
                    "match_count": limit
                }
            ).execute()
            
            documents = []
            for doc in result.data or []:
                documents.append(Document(
                    id=doc["id"],
                    title=doc.get("title"),
                    version=doc.get("version"),
                    markdown_content=doc.get("markdown_content"),
                    summary=doc.get("summary"),
                    similarity=doc.get("similarity"),
                    path=doc.get("path"),
                    name=doc.get("name"),
                    language=doc.get("language"),
                    keywords_array=doc.get("keywords_array", []),
                    urls_array=doc.get("urls_array", []),
                    is_api_ref=doc.get("is_api_ref", False)
                ))
            
            return documents
        except Exception as e:
            raise ValueError(f"Error searching documents: {str(e)}")


# Core functions for testing (not decorated)
async def get_document_by_version_core(document_id: str, version: str) -> DocumentDetailResponse:
    """
    Get a specific version of a document by ID and version.
    
    Args:
        document_id: The ID of the document
        version: The version number of the document
    
    Returns:
        DocumentDetailResponse with the document data
    """
    try:
        document = await DatabaseTool.get_document_by_version(document_id, version)
        return DocumentDetailResponse(
            success=True,
            message="Document retrieved successfully",
            document=document
        )
    except Exception as e:
        return DocumentDetailResponse(
            success=False,
            message=str(e),
            document=None
        )


async def get_all_document_paths_core(is_api_ref: bool = False) -> PathListResponse:
    """
    Get all document paths to check what already exists.
    
    Args:
        is_api_ref: Filter by API reference documents
    
    Returns:
        PathListResponse with list of document paths
    """
    try:
        paths = await DatabaseTool.get_all_document_paths(is_api_ref)
        return PathListResponse(
            success=True,
            message=f"Found {len(paths)} document paths",
            paths=paths
        )
    except Exception as e:
        return PathListResponse(
            success=False,
            message=str(e),
            paths=[]
        )


async def search_similar_documents_core(query: str, limit: int = 10) -> DocumentListResponse:
    """
    Search for documents similar to the given query using semantic search.
    
    Args:
        query: The search query
        limit: Maximum number of documents to return
    
    Returns:
        DocumentListResponse with similar documents
    """
    try:
        documents = await DatabaseTool.search_similar_documents(query, limit)
        return DocumentListResponse(
            success=True,
            message=f"Found {len(documents)} similar documents",
            documents=documents
        )
    except Exception as e:
        return DocumentListResponse(
            success=False,
            message=str(e),
            documents=[]
        )


# Function tools for agents using the consolidated database tool
@function_tool
async def get_document_by_version(document_id: str, version: str) -> DocumentDetailResponse:
    """
    Get a specific version of a document by ID and version.
    
    Args:
        document_id: The ID of the document
        version: The version number of the document
    
    Returns:
        DocumentDetailResponse with the document data
    """
    return await get_document_by_version_core(document_id, version)


@function_tool
async def get_all_document_paths(is_api_ref: bool = False) -> PathListResponse:
    """
    Get all document paths to check what already exists.
    
    Args:
        is_api_ref: Filter by API reference documents
    
    Returns:
        PathListResponse with list of document paths
    """
    return await get_all_document_paths_core(is_api_ref)


@function_tool
async def search_similar_documents(query: str, limit: int = 10) -> DocumentListResponse:
    """
    Search for documents similar to the given query using semantic search.
    
    Args:
        query: The search query
        limit: Maximum number of documents to return
    
    Returns:
        DocumentListResponse with similar documents
    """
    return await search_similar_documents_core(query, limit)