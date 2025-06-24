
import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query

from app.supabase import supabase
from app.models.documents import (
    DocumentCreate,
    DocumentRead,
    GetAllDocumentsResponse,
    DocumentUpdate,
    DocumentContentCreate,
    DocumentContentRead,
)
from app.services.content_processor import build_tree, process_document_content, clean_markdown_content
from app.config import settings

router = APIRouter(tags=["documents"])


@router.post("/", response_model=DocumentRead)
async def create_document(document: DocumentCreate, content: Optional[DocumentContentCreate] = None):
    """
    Create a new document with optional content.
    If content is not provided, only the document metadata is created (useful for folder structure).
    """
    try:
        # Validate required fields
        if not document.name:
            raise HTTPException(status_code=400, detail="Path and name are required fields")
            
        # Insert new document (initially without content reference)
        doc_data = document.model_dump()
        doc_result = supabase.table("documents").insert(doc_data).execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=500, detail="Failed to create document")
        
        new_doc = doc_result.data[0]
        doc_id = new_doc["id"]
        
        # If content is provided, create a version
        version_id = None
        if content:
            # Process the content to extract keywords, URLs, and generate summary
            processed_content = await process_document_content(
                content.markdown_content, 
                content.language
            )
            
            # Insert document content as first version
            content_data = content.model_dump()
            content_data.update(processed_content)  # Add the processed content fields
            content_data["document_id"] = doc_id
            content_result = supabase.table("document_contents").insert(content_data).execute()
            
            if not content_result.data:
                # Roll back document creation if content creation fails
                supabase.table("documents").delete().eq("id", doc_id).execute()
                raise HTTPException(status_code=500, detail="Failed to create document content")
            
            version_id = content_result.data[0]["version"]
            
            # Update the document with the current version ID
            supabase.table("documents").update(
                {"current_version_id": version_id}
            ).eq("id", doc_id).execute()
        
        # Return the created document (with version_id if content was provided)
        return {**new_doc, "current_version_id": version_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/root", response_model=List[DocumentRead])
async def get_root_documents():
    """Get all root-level documents (no parent)"""
    try:
        print("Fetching root documents...")
        result = supabase.table("documents").select("*").is_("parent_id", None).eq("is_deleted", False).is_("current_version_id", None).execute()
        print(f"Root documents found: {len(result.data)}")
        return result.data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_document(doc_id: str):
    """Get document metadata + latest version"""
    try:
        result = supabase.table("documents").select("*").eq("id", str(doc_id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{doc_id}/versions", response_model=List[DocumentContentRead])
async def list_document_versions(doc_id: str):
    """List all versions of a document"""
    try:
        result = supabase.table("document_contents").select("*").eq("document_id", str(doc_id)).order("created_at", desc=True).execute()
        
        return result.data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{doc_id}/versions/{version_id}", response_model=DocumentContentRead)
async def get_document_version(doc_id: str, version_id: str):
    """Get a specific version (optional: `latest` as alias)"""
    try:
        if version_id.lower() == "latest":
            # Get the document to find current_version_id
            doc_result = supabase.table("documents").select("current_version_id").eq("id", str(doc_id)).execute()
            
            if not doc_result.data:
                raise HTTPException(status_code=404, detail="Document not found")
            
            version_id = doc_result.data[0]["current_version_id"]
            
            if not version_id:
                raise HTTPException(status_code=404, detail="No versions found for this document")
        
        result = supabase.table("document_contents").select("*").eq("document_id", str(doc_id)).eq("version", version_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Version not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{doc_id}/versions/previous", response_model=DocumentContentRead)
async def get_previous_document_version(doc_id: str):
    """Get the second-latest version"""
    try:
        result = supabase.table("document_contents").select("*").eq("document_id", str(doc_id)).order("created_at", desc=True).limit(2).execute()
        
        if not result.data or len(result.data) < 2:
            raise HTTPException(status_code=404, detail="No previous version found")
        
        return result.data[1]  # Return the second item (previous version)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{parent_id}/children", response_model=List[DocumentRead])
async def get_child_documents(parent_id: str):
    """Get all child documents"""
    try:
        result = supabase.table("documents").select("*").eq("parent_id", str(parent_id)).eq("is_deleted", False).execute()
        
        return result.data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


# @router.get("/refs", response_model=List[DocumentRead])
async def get_api_refs():
    """Get all documents where is_api_ref = true"""
    try:
        result = supabase.table("documents").select("*").eq("is_api_ref", True).eq("is_deleted", False).execute()
        return result.data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{doc_id}/parents", response_model=List[DocumentRead])
async def get_document_parents(doc_id: str):
    """Get all ancestors (full lineage)"""
    try:
        # First get the document to find its parent
        doc_result = supabase.table("documents").select("*").eq("id", str(doc_id)).execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_result.data[0]
        parents = []
        
        # Traverse up the parent chain
        current_parent_id = document.get("parent_id")
        while current_parent_id:
            parent_result = supabase.table("documents").select("*").eq("id", current_parent_id).execute()
            
            if not parent_result.data:
                break
            
            parent = parent_result.data[0]
            parents.append(parent)
            current_parent_id = parent.get("parent_id")
        
        return parents
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")




@router.get("/",response_model=GetAllDocumentsResponse)
async def get_all_documents(
    is_deleted: Optional[bool] = Query(False),
    is_api_ref: Optional[bool] = None,
    parent_id: Optional[str] = None
)-> GetAllDocumentsResponse:
    """Get all documents with complete hierarchy (with optional filters) and its content"""
    try:
        # First, let's build the base query with proper join
        query = (supabase.table("documents")
                .select("*, document_contents!fk_current_version(markdown_content, language, keywords_array)")
                .eq("is_deleted", is_deleted))
        
        # Apply optional filters
        if is_api_ref is not None:
            query = query.eq("is_api_ref", is_api_ref)
        
        if parent_id:
            query = query.eq("parent_id", parent_id)
        
        result = query.execute()
        
        all_docs = result.data

        # flat document_contents
        for doc in all_docs:
            if "document_contents" in doc:
                content = doc.get("document_contents") or {}
                doc["markdown_content"] = clean_markdown_content(content.get("markdown_content", ""))
                doc["language"] = content.get("language")
                doc["keywords_array"] = content.get("keywords_array", [])
                del doc["document_contents"]
        print(f"Total documents fetched: {len(all_docs)}")

        # Split into groups based on is_api_ref and language
        # docs = [doc for doc in all_docs if not doc["is_api_ref"]]
        # refs = [doc for doc in all_docs if doc["is_api_ref"]]
        output={}
        for lang in settings.languages_list:
            
            docs = [doc for doc in all_docs if not doc["is_api_ref"] and (doc.get("language") == lang or doc.get("language") is None)]
            refs = [doc for doc in all_docs if doc["is_api_ref"] and (doc.get("language") == lang or doc.get("language") is None)]
            print(f"Processing {len(docs)} documentation and {len(refs)} API references for language '{lang}'")
            

            # Sort by name/path
            docs.sort(key=lambda x: x.get("path", "").lower())
            refs.sort(key=lambda x: x.get("path", "").lower())
            output[lang] = {
                "documentation": build_tree(docs),
                "api_references": build_tree(refs)
            }
            print(f"Processed {len(output[lang]['documentation'])} documentation and {len(output[lang]['api_references'])} API references for language '{lang}'")
            
        return output
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.put("/{doc_id}", response_model=DocumentRead)
async def update_document(doc_id: str, document: DocumentUpdate):
    """Update document metadata (title, path, etc.) or delete it"""
    try:
        # Get only the non-None values for the update
        update_data = {k: v for k, v in document.model_dump().items() if v is not None}
        
        # If path or name are provided, ensure they're not empty strings
        if 'path' in update_data and not update_data['path']:
            raise HTTPException(status_code=400, detail="Path cannot be empty")
        if 'name' in update_data and not update_data['name']:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
            
        result = supabase.table("documents").update(update_data).eq("id", str(doc_id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.post("/{doc_id}/versions", response_model=DocumentContentRead)
async def create_document_version(doc_id: str, content: DocumentContentCreate):
    """Create a new version for a document (and update latest version)"""
    try:
        # Check if document exists
        doc_result = supabase.table("documents").select("*").eq("id", str(doc_id)).execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Process the content to extract keywords, URLs, and generate summary
        processed_content = await process_document_content(
            content.markdown_content, 
            content.language
        )
        
        # Insert new version
        content_data = content.model_dump()
        content_data.update(processed_content)  # Add the processed content fields
        content_data["document_id"] = str(doc_id)
        result = supabase.table("document_contents").insert(content_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create version")
        
        new_version = result.data[0]
        version_id = new_version["version"]
        
        # Update the document with the new current version ID
        supabase.table("documents").update(
            {"current_version_id": version_id}
        ).eq("id", str(doc_id)).execute()
        
        return new_version
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")