from uuid import UUID
from typing import Dict, List
from .models import Item

# In-memory database to store items
items_db: Dict[UUID, Item] = {}