# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doc-Sync is a documentation management system for the OpenAI Agents SDK, built with a FastAPI backend and Next.js frontend. The system allows users to view, edit, and manage documentation in multiple languages with AI-powered assistance.

## Repository Structure

- `fastapi_backend/`: Backend service built with FastAPI
  - Uses Supabase for database operations
  - Integrates with OpenAI for AI-powered content editing
  - Implements OpenAI Agents framework for document processing
  - Supports document versioning and multi-language content
- `nextjs-frontend/`: Frontend application built with Next.js 15
  - Uses Shadcn UI components with Tailwind CSS
  - Type-safe API client generated from OpenAPI schema
  - Supports markdown rendering with syntax highlighting
  - Implements diff viewer for change proposals
- `local-shared-data/`: Shared directory for OpenAPI schema exchange
- `data/`: Preprocessed OpenAI Agents SDK documentation

## Development Commands

### Backend Development

```bash
# Start the backend server with hot reloading
cd fastapi_backend && ./start.sh
# or
make start-backend

# Run backend tests
cd fastapi_backend && uv run pytest
# or
make test-backend

# Run a specific test
cd fastapi_backend && uv run pytest tests/path/to/test_file.py::test_function_name -v

# Type check backend code
cd fastapi_backend && uv run mypy app

# Lint backend code
cd fastapi_backend && uv run ruff check app

# Format backend code
cd fastapi_backend && uv run ruff format app

# Generate database migration
make docker-db-schema migration_name="your migration description"

# Apply database migrations
make docker-migrate-db
```

### Frontend Development

```bash
# Start the frontend development server
cd nextjs-frontend && ./start.sh
# or
make start-frontend

# Run frontend tests
cd nextjs-frontend && pnpm run test
# or
make test-frontend

# Run code linting
cd nextjs-frontend && pnpm run lint

# Type check the project
cd nextjs-frontend && pnpm run tsc

# Generate OpenAPI client
cd nextjs-frontend && pnpm run generate-client

# Format code with Prettier
cd nextjs-frontend && pnpm run format
```

### Docker Commands

```bash
# Build all services
make docker-build

# Start backend container
make docker-start-backend

# Start frontend container
make docker-start-frontend

# Access backend shell
make docker-backend-shell

# Access frontend shell
make docker-frontend-shell

# Run backend tests in Docker
make docker-test-backend

# Run frontend tests in Docker
make docker-test-frontend
```

## Key Architecture Components

### Backend

1. **FastAPI Routes**
   - **Documents Router** (`/api/documents`):
     - `POST /` - Create document with optional content
     - `GET /root` - Get root-level documents
     - `GET /{doc_id}` - Get document metadata + latest version
     - `GET /{doc_id}/versions` - List all document versions
     - `GET /{doc_id}/versions/{version_id}` - Get specific version
     - `GET /{parent_id}/children` - Get child documents
     - `GET /{doc_id}/parents` - Get document lineage
     - `GET /` - Get all documents with hierarchy and content
     - `PUT /{doc_id}` - Update document metadata
     - `POST /{doc_id}/versions` - Create new document version
   - **Edit Documentation Router** (`/api/edit`):
     - `POST /` - AI-powered documentation editing
     - `POST /update_documentation` - Apply suggested changes

2. **Database Schema (Supabase/PostgreSQL)**
   - `documents` table:
     - `id`, `name`, `title`, `path`, `is_api_ref`, `parent_id`, `current_version_id`
     - `is_deleted`, `created_at`, `updated_at`
   - `document_contents` table:
     - `version`, `document_id`, `language`, `markdown_content`, `keywords_array`
     - `urls_array`, `summary`, `embedding`, `created_at`, `updated_at`

3. **Repository Pattern**
   - `DocumentRepository` - Document metadata CRUD operations
   - `ContentRepository` - Version management for document content
   - Both use async methods with proper error handling

4. **Service Layer**
   - `DocumentService` - Orchestrates document operations and content processing
   - `EditService` - Handles AI-powered editing workflows
   - Services inject repositories and handle business logic

5. **AI Agent System (OpenAI Agents SDK)**
   - `BaseAgent` class with common configuration and factory pattern
   - **Intent Detection Agent** - Analyzes user queries for edit/create/delete intent
   - **Edit Suggestion Agent** - Identifies relevant documents and suggests modifications
   - **Content Edit Agent** - Generates precise text replacements
   - **Create Content Agent** - Generates new documentation content
   - **Delete Content Agent** - Identifies documents for deletion
   - **MainEditor** - Coordinates multi-agent workflows with concurrent processing

6. **Content Processing Pipeline**
   - Automatic keyword extraction using OpenAI
   - Summary generation with language detection
   - URL extraction from markdown content
   - Embedding generation for semantic search (text-embedding-3-large)
   - Tree structure building for hierarchical documents

### Frontend

1. **Pages and Routing (Next.js 15 App Router)**
   - `/` - Landing page with feature overview
   - `/documentation` - Main documentation viewer with tree navigation
   - `/create-document` - Document creation with tabs for folders/documents
   - `/documentation-change` - AI-powered change suggester interface

2. **UI Architecture**
   - **Documentation Page**: 20% collapsible sidebar + 80% content area
   - **Component Library**: Shadcn/ui with Radix UI primitives
   - **Styling**: Tailwind CSS with dark mode support
   - **Responsive Design**: Mobile-first with hamburger menu

3. **Type Safety & API Integration**
   - Auto-generated TypeScript client from FastAPI OpenAPI schema
   - File watcher system regenerates client when backend schema changes
   - End-to-end type safety from API to UI components
   - Centralized client configuration in `clientConfig.ts`

4. **State Management & Caching**
   - **DocumentCache**: 5-minute TTL with timestamp expiry
   - **Session Storage**: Cross-page document selection preservation
   - **React Hook Form**: Form state management with validation
   - **Cache-first approach**: Memory cache with API fallback

5. **Key Components**
   - **DocumentTree**: Hierarchical navigation with search and expand/collapse
   - **MarkdownRenderer**: React-markdown with syntax highlighting and version history
   - **DiffViewer**: Side-by-side and inline diff views with raw/rendered modes
   - **LanguageSelector**: Multi-language document support dropdown

## Environment Configuration

### Backend (`.env` in fastapi_backend/)

```
CORS_ORIGINS={"http://localhost:3000"}
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
LANGUAGES=["en", "ja"]
LOG_LEVEL=info
```

### Frontend (`.env.local` in nextjs-frontend/)

```
API_BASE_URL=http://localhost:8000
OPENAPI_OUTPUT_FILE=../local-shared-data/openapi.json
```

## Typical Workflows

### Starting Development
1. Start the backend server: `make start-backend`
2. Start the frontend server: `make start-frontend`
3. Backend generates OpenAPI schema in `local-shared-data/openapi.json`
4. Frontend watcher auto-generates TypeScript client from the schema
5. Access the application at `http://localhost:3000`

### Creating a New Document
1. Navigate to `/create-document`
2. Fill in category, parent document (optional), title, and content
3. Document is created with automatic keyword extraction and summarization
4. Available in selected language with version 1

### AI-Powered Document Editing
1. Navigate to `/documentation-change`
2. Use natural language to describe desired changes
3. Use document mention system (@document-name) for references
4. AI processes intent and generates structured edits
5. Review changes in diff viewer (side-by-side or inline)
6. Select and apply individual changes or bulk operations

### Adding a New Language
1. Use the clone endpoint to copy existing content
2. Or create new content version with PUT to contents endpoint
3. Frontend automatically shows language in selector

## Important Architectural Patterns

### Backend Patterns
- **Repository Pattern**: All database operations go through repository classes
- **Service Layer**: Business logic separated from API routes
- **Dependency Injection**: Services and repositories injected into routes
- **Async/Await**: All database and AI operations are asynchronous
- **Error Handling**: Custom exception hierarchy with service-to-HTTP mapping
- **Agent Coordination**: Multi-agent workflows with concurrent processing

### Frontend Patterns
- **OpenAPI-First**: TypeScript client auto-generated from backend schema
- **Component Composition**: Reusable UI components with clear separation
- **Cache Management**: Intelligent cache invalidation on document mutations
- **Cross-Page State**: Session storage for maintaining selection across navigation
- **Progressive Enhancement**: Graceful degradation for AI features

### Development Notes
- Backend uses UV for dependency management, not pip
- Frontend uses PNPM for package management, not npm
- OpenAPI schema is shared via `local-shared-data/openapi.json`
- File watchers auto-regenerate TypeScript client on backend changes
- Database uses Supabase RPC functions for complex queries
- AI agents use structured output with Pydantic models for validation

## Data Import

The project includes preprocessed OpenAI Agents SDK documentation in `documentation_openai_sdk/`:
- Multiple JSON files representing different sections of the SDK docs
- Supports both English and Japanese language versions
- Use `data_preprocess.py` script to process and import into Supabase database
