from typing import List, Optional, Dict, Any
from app.supabase import supabase
from app.core.exceptions import DocumentNotFoundError, DocumentCreationError, DocumentUpdateError
from app.core.logging import performance_monitor, cached


class DocumentRepository:
    @staticmethod
    async def create_document(doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document in the database"""
        try:
            result = supabase.table("documents").insert(doc_data).execute()
            if not result.data:
                raise DocumentCreationError("Failed to insert document")
            return result.data[0]
        except Exception as e:
            raise DocumentCreationError(str(e))

    @staticmethod
    @performance_monitor("DocumentRepository.get_document_by_id")
    @cached(ttl=300)  # Cache for 5 minutes
    async def get_document_by_id(doc_id: str) -> Dict[str, Any]:
        """Get a document by ID"""
        try:
            result = supabase.table("documents").select("*").eq("id", str(doc_id)).execute()
            if not result.data:
                raise DocumentNotFoundError(doc_id)
            return result.data[0]
        except Exception as e:
            if isinstance(e, DocumentNotFoundError):
                raise
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def get_root_documents(is_api_ref: Optional[bool] = True) -> List[Dict[str, Any]]:
        """Get all root-level documents (no parent)"""
        try:
            query = (supabase.table("documents")
                    .select("*")
                    .is_("parent_id", None)
                    .eq("is_deleted", False)
                    .is_("current_version_id", None))
            
            if is_api_ref is not None:
                query = query.eq("is_api_ref", is_api_ref)
            
            result = query.execute()
            return result.data
        except Exception as e:
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def get_child_documents(parent_id: str) -> List[Dict[str, Any]]:
        """Get all child documents"""
        try:
            result = (supabase.table("documents")
                     .select("*")
                     .eq("parent_id", str(parent_id))
                     .eq("is_deleted", False)
                     .execute())
            return result.data
        except Exception as e:
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def get_document_parents(doc_id: str) -> List[Dict[str, Any]]:
        """Get all ancestors (full lineage)"""
        try:
            # First get the document to find its parent
            document = await DocumentRepository.get_document_by_id(doc_id)
            parents = []
            
            # Traverse up the parent chain
            current_parent_id = document.get("parent_id")
            while current_parent_id:
                parent = await DocumentRepository.get_document_by_id(current_parent_id)
                parents.append(parent)
                current_parent_id = parent.get("parent_id")
            
            return parents
        except Exception as e:
            if isinstance(e, DocumentNotFoundError):
                raise
            raise DocumentUpdateError(str(e))

    @staticmethod
    @performance_monitor("DocumentRepository.get_all_documents")
    @cached(ttl=180)  # Cache for 3 minutes
    async def get_all_documents(is_deleted: bool = False, is_api_ref: Optional[bool] = None, 
                               parent_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all documents with optional filters"""
        try:
            query = (supabase.table("documents")
                    .select("*, document_contents!documents_current_version_fkey(markdown_content, language, keywords_array)")
                    .eq("is_deleted", is_deleted))
            
            if is_api_ref is not None:
                query = query.eq("is_api_ref", is_api_ref)
            
            if parent_id:
                query = query.eq("parent_id", parent_id)
            
            result = query.execute()
            return result.data
        except Exception as e:
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def update_document(doc_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update document metadata"""
        try:
            result = supabase.table("documents").update(update_data).eq("id", str(doc_id)).execute()
            if not result.data:
                raise DocumentNotFoundError(doc_id)
            return result.data[0]
        except Exception as e:
            if isinstance(e, DocumentNotFoundError):
                raise
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def update_current_version(doc_id: str, version_id: str) -> None:
        """Update the current version ID of a document"""
        try:
            result = supabase.table("documents").update(
                {"current_version_id": version_id}
            ).eq("id", str(doc_id)).execute()
            if not result.data:
                raise DocumentNotFoundError(doc_id)
        except Exception as e:
            if isinstance(e, DocumentNotFoundError):
                raise
            raise DocumentUpdateError(str(e))

    @staticmethod
    async def delete_document(doc_id: str) -> bool:
        """Mark document as deleted (soft delete)"""
        try:
            result = supabase.table("documents").update(
                {"is_deleted": True}
            ).eq("id", str(doc_id)).execute()
            return bool(result.data)
        except Exception as e:
            raise DocumentUpdateError(str(e))