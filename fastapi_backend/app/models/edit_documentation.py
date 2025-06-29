from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
from pydantic import BaseModel, Field

class EditDocumentationRequest(BaseModel):
    query: str
    document_id: Optional[str] = None