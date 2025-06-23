from httpx import AsyncClient, ASGITransport
import pytest_asyncio

from app.main import app


@pytest_asyncio.fixture(scope="function")
async def test_client():
    """Fixture to create a test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://localhost:8000"
    ) as client:
        yield client