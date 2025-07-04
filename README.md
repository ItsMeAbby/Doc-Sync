# Doc-Sync

An AI-powered documentation management system for the OpenAI Agents SDK, featuring intelligent content editing, multi-language support, and hierarchical document organization.

<p align="center">
    <em>AI-enhanced documentation platform with FastAPI backend and Next.js frontend.</em>
</p>

---

Doc-Sync is a comprehensive documentation management platform that combines the power of AI with modern web technologies to provide intelligent document editing, organization, and multi-language support. Built specifically for managing OpenAI Agents SDK documentation, it offers natural language editing capabilities and sophisticated document versioning.

## Key Features

🤖 **AI-Powered Documentation Editing**
- Natural language change descriptions converted to precise document edits
- OpenAI Agents SDK integration for intelligent content processing
- Multi-agent system for edit suggestions, content creation, and intent detection

📚 **Intelligent Document Management**
- Hierarchical document organization with parent-child relationships
- Version control with content history and rollback capabilities
- Automatic keyword extraction and content summarization
- Semantic search using OpenAI embeddings

🌍 **Multi-Language Support**
- Document content versioning by language (English/Japanese)
- Language-specific content with consistent structure
- Automatic language detection and processing

🔄 **Real-Time Synchronization**
- Auto-generated TypeScript API client from OpenAPI schema
- Hot-reload updates when backend routes change
- End-to-end type safety between frontend and backend

🎨 **Modern User Interface**
- Clean, responsive design with Tailwind CSS and Shadcn/ui
- Collapsible document tree with search functionality
- Side-by-side diff viewer for change proposals
- Mobile-first responsive design

⚡ **Performance Optimizations**
- 5-minute document caching with intelligent invalidation
- Concurrent AI agent processing
- Optimized Next.js 15 with App Router
- Async-first FastAPI backend

## Technology Stack

### Backend (FastAPI)
- **FastAPI 0.115+** - Modern, fast web framework for building APIs
- **OpenAI Agents SDK** - AI agent orchestration and management
- **Supabase** - PostgreSQL database with real-time features
- **Pydantic** - Data validation and settings management
- **OpenAI API** - GPT-4.1 for content processing and text-embedding-3-large for semantic search
- **Python 3.12** - Latest Python with improved performance

### Frontend (Next.js)
- **Next.js 15** - React framework with App Router and SSR
- **React 19** - Latest React with enhanced concurrent features
- **TypeScript** - Static type checking and improved developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern React component library built on Radix UI
- **React Hook Form** - Performant form handling with validation
- **React Markdown** - Markdown rendering with syntax highlighting

### Development & Deployment
- **UV** - Fast Python package manager and dependency resolver
- **PNPM** - Efficient Node.js package manager
- **Docker** - Containerization for consistent environments
- **OpenAPI-TS** - Auto-generated TypeScript client from OpenAPI schema
- **Pre-commit hooks** - Automated code linting and formatting
- **Pytest** - Comprehensive testing framework with async support
- **Jest** - JavaScript testing framework with React Testing Library

### AI & Data Processing
- **OpenAI Embeddings** - Semantic search and content similarity
- **BeautifulSoup4** - HTML parsing and content extraction
- **Tiktoken** - Token counting and text processing
- **Langdetect** - Automatic language detection

## Get Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PNPM package manager
- Supabase account
- OpenAI API key

### 1. Environment Setup

**Backend Configuration** (create `fastapi_backend/.env`):
```bash
CORS_ORIGINS={"http://localhost:3000"}
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
LANGUAGES=["en", "ja"]
LOG_LEVEL=info
```

**Frontend Configuration** (create `nextjs-frontend/.env.local`):
```bash
API_BASE_URL=http://localhost:8000
OPENAPI_OUTPUT_FILE=../local-shared-data/openapi.json
```

### 2. Start Development Servers

**Option A: Using Make commands**
```bash
# Start backend server
make start-backend

# Start frontend server (in another terminal)
cd nextjs-frontend && pnpm install
cd ..
make start-frontend
```

**Option B: Manual startup**
```bash
# Backend
cd fastapi_backend && ./start.sh

# Frontend (in another terminal)

cd nextjs-frontend && pnpm install 
./start.sh
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

The frontend automatically generates a TypeScript client when the backend schema changes, ensuring type safety across the stack.


## Development Workflow

### Backend Development
```bash
# Run tests
make test-backend

# Type checking
cd fastapi_backend && uv run mypy app

# Code formatting
cd fastapi_backend && uv run ruff format app

```

### Frontend Development
```bash
# Run tests
make test-frontend

# Type checking
cd nextjs-frontend && pnpm run tsc

# Code formatting
cd nextjs-frontend && pnpm run prettier

# Generate API client
cd nextjs-frontend && pnpm run generate-client
```

## Architecture Overview

### Backend Architecture
- **Repository Pattern**: Clean separation of data access logic
- **Service Layer**: Business logic orchestration
- **AI Agent System**: Multi-agent coordination using OpenAI Agents SDK
- **Content Processing**: Automatic summarization, keyword extraction, and embeddings
- **Multi-language**: Document versioning with language-specific content

### Frontend Architecture
- **App Router**: Next.js 15 with server-side rendering
- **Component Library**: Shadcn/ui with Tailwind CSS
- **Type Safety**: Auto-generated API client from OpenAPI schema
- **Caching**: 5-minute TTL with intelligent cache invalidation
- **Responsive Design**: Mobile-first with adaptive layouts

### AI Agent System
- **Intent Detection**: Analyzes user queries for edit/create/delete operations
- **Edit Suggestions**: Identifies relevant documents and suggests modifications
- **Content Generation**: Creates new documentation content
- **Multi-agent Coordination**: Concurrent processing with structured output

## Key Workflows

### 1. Document Management
- Create hierarchical document structures
- Version control with language-specific content
- Automatic content processing (keywords, summaries, embeddings)
- Soft deletion with recovery capabilities

### 2. AI-Powered Editing
- Natural language change descriptions
- Document mention system with autocomplete
- Diff visualization with multiple viewing modes
- Bulk change application

### 3. Multi-Language Support
- Document cloning across languages
- Language-specific content versioning
- Automatic language detection and processing

## API Documentation

### Backend Routes

#### Documents API (`/api/documents`)
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

#### Edit Documentation API (`/api/edit`)
- `POST /` - AI-powered documentation editing
- `POST /update_documentation` - Apply suggested changes

### Database Schema

**Documents Table:**
```sql
- id (UUID, Primary Key)
- name (String)
- title (String) 
- path (String)
- is_api_ref (Boolean)
- parent_id (UUID, Foreign Key)
- current_version_id (UUID)
- is_deleted (Boolean)
- created_at, updated_at (Timestamps)
```

**Document Contents Table:**
```sql
- version (Integer)
- document_id (UUID, Foreign Key)
- language (String) 
- markdown_content (Text)
- keywords_array (String Array)
- urls_array (String Array)
- summary (Text)
- embedding (Vector)
- created_at, updated_at (Timestamps)
```

## AI Agent System

### Agent Architecture
The system uses OpenAI Agents SDK with a multi-agent coordination pattern:

![Agentic Layer Architecture](https://excalidraw.com/#json=YKR0472DqI9opb_cEqW2H,iOPy0UDTDNp9VB1BL_03Cw)

The architecture follows a structured flow where user input is processed through specialized AI agents:

1. **Intent Detection Agent**: Analyzes user queries to determine edit/create/delete intent
2. **Create Agent**: Handles document and content creation workflows
   - Generates new documentation content
   - Creates folder structures and hierarchies
3. **Edit Suggestion Agent**: Manages document modification workflows
   - Identifies relevant documents for editing
   - Runs separately for API and non-API documents
   - Generates precise text replacements through Content Edit Agent
4. **Delete Agent**: Handles document deletion operations
   - Identifies documents for removal
   - Manages soft deletion with recovery capabilities
5. **MainEditor**: Coordinates multi-agent workflows with concurrent processing

All agents operate within the **Agentic Layer** that processes user input and generates structured suggestions, which are then presented to the user for confirmation before applying changes.

### Content Processing Pipeline
- **Keyword Extraction**: Automatic extraction using OpenAI API
- **Summarization**: Content summaries with language detection
- **URL Extraction**: Parse and extract URLs from markdown content
- **Embeddings**: Generate semantic search vectors using text-embedding-3-large
- **Tree Building**: Construct hierarchical document relationships

## User Interface Features

### Documentation Viewer (`/documentation`)
- **Sidebar Navigation** (20%): Collapsible document tree with search
- **Content Area** (80%): Markdown rendering with syntax highlighting
- **Language Selector**: Switch between English/Japanese versions
- **Version History**: Access previous document versions
- **Mobile Responsive**: Hamburger menu for mobile devices

### Document Creation (`/create-document`)
- **Tabbed Interface**: Create Parent Folder vs Create Document
- **Form Validation**: React Hook Form with Zod validation
- **Parent Selection**: Choose parent document with API Reference marking
- **Multi-language**: Create content in English or Japanese

### AI Change Suggester (`/documentation-change`)
- **Natural Language Input**: Describe changes in plain English
- **Document Mentions**: @document-name autocomplete system
- **Diff Viewer**: Side-by-side and inline change visualization
- **Bulk Operations**: Select and apply multiple changes at once

## Advanced Features

### Caching Strategy
- **5-minute TTL**: Document content cached for optimal performance
- **Cache Invalidation**: Automatic invalidation on document updates
- **Session Storage**: Preserve navigation state across page transitions
- **Refresh Capability**: Force refresh bypasses cache

### Type Safety
- **Auto-generated Client**: TypeScript client from OpenAPI schema
- **File Watcher**: Regenerates client when backend routes change
- **End-to-end Types**: Type safety from database to UI components
- **Validation**: Pydantic models for API validation

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Adaptive Layout**: Different layouts for mobile/desktop
- **Touch-friendly**: Appropriate touch targets
- **Dark Mode**: Built-in dark mode support

## Testing

### Backend Testing
```bash
# Run all tests
make test-backend

# Run specific test file
cd fastapi_backend && uv run pytest tests/routes/test_documents.py -v

# Run with coverage
cd fastapi_backend && uv run pytest --cov=app --cov-report=html

# Run tests in parallel
cd fastapi_backend && uv run pytest -n auto
```

### Frontend Testing
```bash
# Run all tests
make test-frontend

# Run tests in watch mode
cd nextjs-frontend && pnpm run test --watch

# Run with coverage
cd nextjs-frontend && pnpm run coverage
```

## Docker Development

### Container Management
```bash
# Build all services
make docker-build

# Start development environment
make docker-start-backend
make docker-start-frontend

# Access container shells
make docker-backend-shell
make docker-frontend-shell
```

## Performance Optimizations

### Backend Optimizations
- **Async Operations**: All database and AI operations are asynchronous
- **Connection Pooling**: Supabase handles connection management
- **Concurrent Processing**: Multi-agent workflows run in parallel
- **Caching Decorators**: Available for expensive operations

### Frontend Optimizations
- **Code Splitting**: Automatic by Next.js App Router
- **Image Optimization**: Next.js built-in optimizations
- **Bundle Analysis**: TypeScript checking at build time
- **Lazy Loading**: Components loaded as needed

## Security Considerations

- **Environment Variables**: All secrets configured through environment
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Pydantic models validate all API inputs
- **SQL Injection Prevention**: Supabase client handles parameterization
- **XSS Protection**: React's built-in XSS protection

## Monitoring and Debugging

### Logging
- **Structured Logging**: JSON-formatted logs with log levels
- **Request Tracing**: Track requests through the system
- **Error Tracking**: Comprehensive error logging and handling

### Development Tools
- **API Documentation**: Auto-generated Swagger UI at `/docs`
- **Database Inspection**: Supabase dashboard for data inspection
- **Hot Reloading**: Both frontend and backend support hot reload

## Production Deployment

### Backend Deployment
- **Serverless Ready**: Compatible with Vercel, Railway, Heroku
- **Environment Configuration**: All configuration via environment variables
- **Database Migrations**: Supabase handles schema management
- **Scaling**: Horizontal scaling through container orchestration

### Frontend Deployment
- **Static Optimization**: Next.js build optimization
- **CDN Ready**: Static assets optimized for CDN delivery
- **Edge Functions**: Vercel edge functions for dynamic content
- **Progressive Web App**: PWA capabilities built-in

### Database Setup
```bash
# Set up Supabase project
1. Create account at supabase.com
2. Create new project
3. Copy URL and anon key to environment variables
4. Run migrations (handled automatically)
```

For comprehensive development and deployment guidance, see the `CLAUDE.md` file which contains detailed instructions for working with this codebase.