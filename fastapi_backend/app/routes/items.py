from uuid import UUID
from typing import List

from fastapi import APIRouter, HTTPException

from app.database import items_db
from app.models import Item, ItemCreate, ItemRead

router = APIRouter(tags=["item"])


@router.get("/", response_model=List[ItemRead])
async def read_items():
    return list(items_db.values())


@router.post("/", response_model=ItemRead)
async def create_item(item: ItemCreate):
    new_item = Item(**item.model_dump())
    items_db[new_item.id] = new_item
    return new_item


@router.delete("/{item_id}")
async def delete_item(item_id: UUID):
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    
    del items_db[item_id]
    return {"message": "Item successfully deleted"}