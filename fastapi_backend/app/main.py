from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.utils import simple_generate_unique_route_id
from app.routes.items import router as items_router
from app.config import settings

app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)

# Middleware for CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include items routes
app.include_router(items_router, prefix="/items")