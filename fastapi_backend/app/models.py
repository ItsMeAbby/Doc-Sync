from pydantic import BaseModel
from uuid import UUID, uuid4


class ItemBase(BaseModel):
    name: str
    description: str | None = None
    quantity: int | None = None


class ItemCreate(ItemBase):
    pass


class ItemRead(ItemBase):
    id: UUID

    class Config:
        from_attributes = True


class Item:
    def __init__(
        self,
        name: str,
        description: str | None = None,
        quantity: int | None = None,
        id: UUID | None = None,
    ):
        self.id = id or uuid4()
        self.name = name
        self.description = description
        self.quantity = quantity