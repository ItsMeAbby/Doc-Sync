import pytest
from fastapi import status
import uuid


class TestItems:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_item(self, test_client):
        """Test creating an item."""
        item_data = {"name": "Test Item", "description": "Test Description"}
        create_response = await test_client.post("/items/", json=item_data)

        assert create_response.status_code == status.HTTP_200_OK
        created_item = create_response.json()
        assert created_item["name"] == item_data["name"]
        assert created_item["description"] == item_data["description"]
        assert "id" in created_item

    @pytest.mark.asyncio(loop_scope="function")
    async def test_read_items(self, test_client):
        """Test reading items."""
        # Create an item first
        item_data = {"name": "Read Test Item", "description": "For reading test"}
        await test_client.post("/items/", json=item_data)

        # Read items
        read_response = await test_client.get("/items/")
        assert read_response.status_code == status.HTTP_200_OK
        items = read_response.json()

        # At least one item should exist
        assert len(items) >= 1
        assert any(item["name"] == "Read Test Item" for item in items)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_delete_item(self, test_client):
        """Test deleting an item."""
        # Create an item first
        item_data = {"name": "Item to Delete", "description": "Will be deleted"}
        create_response = await test_client.post("/items/", json=item_data)
        created_item = create_response.json()

        # Delete the item
        delete_response = await test_client.delete(f"/items/{created_item['id']}")
        assert delete_response.status_code == status.HTTP_200_OK

        # Verify item is deleted - should not be in the list anymore
        read_response = await test_client.get("/items/")
        items = read_response.json()
        assert not any(item["id"] == created_item["id"] for item in items)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_delete_nonexistent_item(self, test_client):
        """Test deleting an item that doesn't exist."""
        # Try to delete non-existent item using a random UUID
        random_id = str(uuid.uuid4())
        delete_response = await test_client.delete(f"/items/{random_id}")
        assert delete_response.status_code == status.HTTP_404_NOT_FOUND