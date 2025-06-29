from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.utils import simple_generate_unique_route_id
from app.routes.documents import router as documents_router
from app.routes.edit_documentation import router as edit_documentation_router
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

# Include routes
app.include_router(documents_router, prefix="/api/documents")
app.include_router(edit_documentation_router, prefix="/api/edit")
