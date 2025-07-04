from typing import List, Optional, Dict, Any
from app.models.documents import (
    DocumentCreate, DocumentRead, DocumentUpdate, 
    DocumentContentCreate, DocumentContentRead, GetAllDocumentsResponse
)
from app.core.repositories.document_repository import DocumentRepository
from app.core.repositories.content_repository import ContentRepository
from app.core.exceptions import ValidationError, DocumentNotFoundError
from app.services.content_processor import build_tree, process_document_content, clean_markdown_content
from app.config import settings


class DocumentService:
    def __init__(self):
        self.doc_repo = DocumentRepository()
        self.content_repo = ContentRepository()

    async def create_document(self, document: DocumentCreate, content: Optional[DocumentContentCreate] = None) -> DocumentRead:
        """Create a new document with optional content"""
        # Validate required fields
        if not document.name:
            raise ValidationError("name", "Path and name are required fields")
        
        # Insert new document (initially without content reference)
        doc_data = document.model_dump()
        new_doc = await self.doc_repo.create_document(doc_data)
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
            content_result = await self.content_repo.create_content(content_data)
            
            version_id = content_result["version"]
            
            # Update the document with the current version ID
            await self.doc_repo.update_current_version(doc_id, version_id)
        
        # Return the created document (with version_id if content was provided)
        print(f"Document created with ID: {doc_id}, Version ID: {version_id}")
        return {**new_doc, "current_version_id": version_id}

    async def get_root_documents(self, is_api_ref: Optional[bool] = True) -> List[DocumentRead]:
        """Get all root-level documents (no parent)"""
        print("Fetching root documents...")
        documents = await self.doc_repo.get_root_documents(is_api_ref)
        print(f"Root documents found: {len(documents)}")
        return documents

    async def get_document(self, doc_id: str) -> DocumentRead:
        """Get document metadata + latest version"""
        return await self.doc_repo.get_document_by_id(doc_id)

    async def list_document_versions(self, doc_id: str) -> List[DocumentContentRead]:
        """List all versions of a document"""
        # Get the document to find the current version ID
        doc_result = await self.doc_repo.get_document_by_id(doc_id)
        current_version_id = doc_result.get("current_version_id")
        
        # Get all versions
        versions = await self.content_repo.get_document_versions(doc_id)
        
        # Add the 'latest' flag to each version
        for version in versions:
            version["latest"] = version["version"] == current_version_id
            
        return versions

    async def get_document_version(self, doc_id: str, version_id: str) -> DocumentContentRead:
        """Get a specific version (optional: `latest` as alias)"""
        doc_result = await self.doc_repo.get_document_by_id(doc_id)
        
        if version_id.lower() == "latest":
            version_id = doc_result.get("current_version_id")
            if not version_id:
                raise DocumentNotFoundError("No versions found for this document")
        
        name = doc_result.get("name")
        title = doc_result.get("title")
        path = doc_result.get("path")
        
        content = await self.content_repo.get_document_version(doc_id, version_id)
        
        content["name"] = name
        content["title"] = title
        content["path"] = path
        
        return content

    async def get_child_documents(self, parent_id: str) -> List[DocumentRead]:
        """Get all child documents"""
        return await self.doc_repo.get_child_documents(parent_id)

    async def get_document_parents(self, doc_id: str) -> List[DocumentRead]:
        """Get all ancestors (full lineage)"""
        return await self.doc_repo.get_document_parents(doc_id)

    async def get_all_documents(self, is_deleted: Optional[bool] = False, 
                               is_api_ref: Optional[bool] = None, 
                               parent_id: Optional[str] = None) -> GetAllDocumentsResponse:
        """Get all documents with complete hierarchy (with optional filters) and its content"""
        all_docs = await self.doc_repo.get_all_documents(is_deleted, is_api_ref, parent_id)

        # Flat document_contents
        for doc in all_docs:
            if "document_contents" in doc:
                content = doc.get("document_contents") or {}
                doc["markdown_content"] = clean_markdown_content(content.get("markdown_content", ""))
                doc["language"] = content.get("language")
                doc["keywords_array"] = content.get("keywords_array", [])
                del doc["document_contents"]
        
        # print(f"Total documents fetched: {len(all_docs)}")

        # Split into groups based on is_api_ref and language
        output = {}
        for lang in settings.languages_list:
            docs = [doc for doc in all_docs if not doc["is_api_ref"] and (doc.get("language") == lang or doc.get("language") is None)]
            refs = [doc for doc in all_docs if doc["is_api_ref"] and (doc.get("language") == lang or doc.get("language") is None)]
            # print(f"Processing {len(docs)} documentation and {len(refs)} API references for language '{lang}'")

            # Sort by name/path
            docs.sort(key=lambda x: x.get("path", "").lower())
            refs.sort(key=lambda x: x.get("path", "").lower())
            output[lang] = {
                "documentation": build_tree(docs),
                "api_references": build_tree(refs)
            }
            # print(f"Processed {len(output[lang]['documentation'])} documentation and {len(output[lang]['api_references'])} API references for language '{lang}'")
            
        return output

    async def update_document(self, doc_id: str, document: DocumentUpdate) -> DocumentRead:
        """Update document metadata (title, path, etc.) or delete it"""
        # Get only the non-None values for the update
        update_data = {k: v for k, v in document.model_dump().items() if v is not None}
        
        # If path or name are provided, ensure they're not empty strings
        if 'path' in update_data and not update_data['path']:
            raise ValidationError("path", "Path cannot be empty")
        if 'name' in update_data and not update_data['name']:
            raise ValidationError("name", "Name cannot be empty")
            
        return await self.doc_repo.update_document(doc_id, update_data)

    async def create_document_version(self, doc_id: str, content: DocumentContentCreate) -> DocumentContentRead:
        """Create a new version for a document (and update latest version)"""
        # Check if document exists
        await self.doc_repo.get_document_by_id(doc_id)
        
        # Process the content to extract keywords, URLs, and generate summary
        processed_content = await process_document_content(
            content.markdown_content, 
            content.language
        )
        
        # Insert new version
        content_data = content.model_dump()
        content_data.update(processed_content)  # Add the processed content fields
        content_data["document_id"] = str(doc_id)
        new_version = await self.content_repo.create_content(content_data)
        
        version_id = new_version["version"]
        
        # Update the document with the new current version ID
        await self.doc_repo.update_current_version(doc_id, version_id)
        print(f"New version created for document {doc_id} with version ID: {version_id}")
        return new_version