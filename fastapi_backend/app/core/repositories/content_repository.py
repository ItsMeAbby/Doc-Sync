from typing import List, Optional, Dict, Any
from app.supabase import supabase
from app.core.exceptions import DocumentNotFoundError, DocumentCreationError, DocumentUpdateError


class ContentRepository:
    @staticmethod
    async def create_content(content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document content version"""
        try:
            result = supabase.table("document_contents").insert(content_data).execute()
            if not result.data:
                raise DocumentCreationError("Failed to create document content")
            return result.data[0]
        except Exception as e:
            raise DocumentCreationError(str(e))

    @staticmethod
    async def get_document_versions(doc_id: str) -> List[Dict[str, Any]]:
        """List all versions of a document"""
        try:
            result = (supabase.table("document_contents")
                     .select("*")
                     .eq("document_id", str(doc_id))
                     .order("created_at", desc=True)
                     .execute())
            return result.data
        except Exception as e:
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def get_document_version(doc_id: str, version_id: str) -> Dict[str, Any]:
        """Get a specific version of a document"""
        try:
            result = (supabase.table("document_contents")
                     .select("*")
                     .eq("document_id", str(doc_id))
                     .eq("version", version_id)
                     .execute())
            
            if not result.data:
                raise DocumentNotFoundError(f"{doc_id}/version/{version_id}")
            
            return result.data[0]
        except Exception as e:
            if isinstance(e, DocumentNotFoundError):
                raise
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def get_latest_version(doc_id: str, current_version_id: Optional[str]) -> Dict[str, Any]:
        """Get the latest version of a document"""
        if not current_version_id:
            raise DocumentNotFoundError(f"{doc_id} (no versions found)")
        
        return await ContentRepository.get_document_version(doc_id, current_version_id)