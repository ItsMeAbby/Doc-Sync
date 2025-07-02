# Doc-Sync FastAPI Backend

This is the backend for the Doc-Sync project, built with FastAPI and Supabase.

## Setup

1. Clone the repository
2. Create a virtual environment: `python -m venv .venv`
3. Activate the virtual environment:
   - Windows: `.venv\Scripts\activate`
   - macOS/Linux: `source .venv/bin/activate`
4. Install dependencies: `pip install -e .`
5. Copy `.env.example` to `.env` and fill in your Supabase and OpenAI credentials:
   ```
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4.1
   OPENAI_EMBEDDING_MODEL=text-embedding-3-large
   
   # DocSync settings
   VECTOR_DIMENSION=1536
   LANGUAGES=["en", "ja"]
   ```

## Supabase Setup

You need to create the following tables in your Supabase project:

### Documents Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES documents(id),
  title TEXT,
  path TEXT,
  name TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_api_ref BOOLEAN DEFAULT FALSE,
  current_version_id UUID,  -- Temporarily without FK
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Document Contents Table

```sql
CREATE TABLE document_contents (
  version UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  markdown_content TEXT,
  language TEXT,
  keywords_array TEXT[],
  urls_array TEXT[],
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  summary TEXT
);
```

### Add Foreign Key Constraint
```sql
ALTER TABLE documents
ADD CONSTRAINT documents_current_version_fkey
FOREIGN KEY (current_version_id)
REFERENCES document_contents(version);
```

## Running the Application

```bash
uvicorn app.main:app --reload
```

## API Endpoints

Note: The API base path is `/api/documents/` (not just `/documents/`)

| Method | Endpoint                                    | Description                                                        |
| ------ | ------------------------------------------- | -------------------------------------------------------------------|
| `POST` | `/api/documents/`                           | Create new document (with optional content)                        |
| `GET`  | `/api/documents/{doc_id}`                   | Get document metadata + latest version                             |
| `GET`  | `/api/documents/{doc_id}/versions`          | List all versions of a document                                    |
| `GET`  | `/api/documents/{doc_id}/versions/{version_id}` | Get a specific version (optional: `latest` as alias)           |
| `GET`  | `/api/documents/{doc_id}/versions/previous` | Get the second-latest version                                      |
| `GET`  | `/api/documents/{parent_id}/children`       | Get all child documents                                            |
| `GET`  | `/api/documents/refs`                       | Get all documents where `is_ref = true`                            |
| `GET`  | `/api/documents/{doc_id}/parents`           | Get all ancestors (full lineage)                                   |
| `GET`  | `/api/documents/root`                       | Get all root-level documents (no parent)                           |
| `GET`  | `/api/documents/`                           | Get all documents with complete hierarchy (with optional filters)  |
| `PUT`  | `/api/documents/{doc_id}`                   | Update document metadata (title, path, etc.) or delete it          |
| `POST` | `/api/documents/{doc_id}/versions`          | Create a new version for a document (and update latest version)    |

## Document Creation

Documents can be created in two ways:

1. **Documents with Content**: When you provide both document metadata and content, the system will:
   - Create the document record
   - Process and store the content
   - Link the document to its content version

2. **Empty Documents/Folders**: You can create a document without any content by simply not providing the content parameter. This is useful for:
   - Creating folder structures
   - Creating placeholder documents that will be filled later
   - Organizing documentation hierarchies

Example request for creating a document with content:
```json
{
  "document": {
    "path": "/docs/tutorials",
    "name": "getting-started",
    "title": "Getting Started Guide"
  },
  "content": {
    "markdown_content": "# Getting Started\n\nThis is a guide to help you get started with our product."
  }
}
```

Example request for creating an empty folder:
```json
{
  "document": {
    "path": "/docs",
    "name": "tutorials",
    "title": "Tutorial Guides"
  }
}
```

## Content Processing

When creating a document with content or adding a new version, the following fields are automatically generated and do not need to be provided:

- `keywords_array`: Extracted keywords from the document content using OpenAI
- `urls_array`: URLs found in the document content using BeautifulSoup parser
- `summary`: A brief summary of the document content using OpenAI
- `language`: Detected language of the content using langdetect (if not provided)
- `embedding`: Vector embeddings of the content for semantic search using OpenAI

These features are implemented in:
- `app/services/content_processor.py`: Main content processing logic
- `app/services/openai_service.py`: OpenAI API integration for embeddings, keywords, and summaries

The content processor handles empty markdown content gracefully, and uses OpenAI's API to generate high-quality keywords and summaries.

## Testing

The project includes comprehensive test suites for the API endpoints and services:

### Running Tests

```bash
# Run all tests
pytest

# Run tests with coverage report
pytest --cov=app

# Run specific test modules
pytest tests/routes/test_documents.py
pytest tests/services/test_content_processor.py
```

### Test Structure

- **API Tests**: Located in `tests/routes/test_documents.py`, testing all document-related endpoints
- **Service Tests**:
  - `tests/services/test_content_processor.py`: Tests for content processing logic
  - `tests/services/test_openai_service.py`: Tests for OpenAI integration with mocked responses

The tests use pytest fixtures and mocks to simulate Supabase database interactions and OpenAI API calls, allowing for fast and reliable test execution without external dependencies.