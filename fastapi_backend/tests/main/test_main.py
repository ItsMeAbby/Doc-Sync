import pytest
from fastapi import status


class TestMainAPI:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_openapi_endpoint(self, test_client):
        """Test that the OpenAPI endpoint is accessible."""
        response = await test_client.get("/openapi.json")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify it contains basic API information
        openapi_schema = response.json()
        assert "openapi" in openapi_schema
        assert "paths" in openapi_schema
        assert "/api/documents/" in openapi_schema["paths"]