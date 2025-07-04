# Doc-Sync Next.js Frontend

Modern, AI-powered documentation frontend built with Next.js 15, TypeScript, and Tailwind CSS. Features intelligent document editing, hierarchical navigation, and real-time type safety.

## Architecture Overview

- **Next.js 15** - React framework with App Router and SSR
- **React 19** - Latest React with enhanced concurrent features
- **TypeScript** - Static type checking with auto-generated API client
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern React component library built on Radix UI

### Key Features

- **Auto-generated API Client**: TypeScript client from OpenAPI schema
- **Component Library**: Shadcn/ui with Tailwind CSS
- **Caching**: 5-minute TTL with intelligent cache invalidation
- **Responsive Design**: Mobile-first with adaptive layouts
- **AI Integration**: Natural language change descriptions and diff viewing

## Quick Start

### Prerequisites
- Node.js 18+
- PNPM package manager
- Running Doc-Sync backend

### Installation

```bash
# Install PNPM if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Copy environment file and configure
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Backend API base URL
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# OpenAPI generated file name (relative to the frontend directory)
OPENAPI_OUTPUT_FILE=openapi.json

# Supported languages
LANGUAGES=["en", "ja"]

# Frontend URL
FRONTEND_URL=http://localhost:3000

# CORS settings
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

## Running the Application

### Development Server

```bash
# Using PNPM (recommended)
pnpm dev

# Or using the start script
./start.sh

# Or using Make command from project root
make start-frontend
```

### Development Commands

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Type checking
pnpm tsc

# Code linting
pnpm lint

# Code formatting
pnpm format


# Build for production
pnpm build
```

## Application Structure

### Pages and Routing (App Router)

- `/` - Landing page with feature overview
- `/documentation` - Main documentation viewer with tree navigation
- `/create-document` - Document creation with tabs for folders/documents
- `/documentation-change` - AI-powered change suggester interface

### UI Architecture

- **Documentation Page**: 20% collapsible sidebar + 80% content area
- **Component Library**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with dark mode support
- **Responsive Design**: Mobile-first with hamburger menu

### Key Components

- **DocumentTree**: Hierarchical navigation with search and expand/collapse
- **MarkdownRenderer**: React-markdown with syntax highlighting and version history
- **DiffViewer**: Side-by-side and inline diff views with raw/rendered modes
- **LanguageSelector**: Multi-language document support dropdown

## State Management & Caching

- **DocumentCache**: 5-minute TTL with timestamp expiry
- **Session Storage**: Cross-page document selection preservation
- **React Hook Form**: Form state management with validation
- **Cache-first approach**: Memory cache with API fallback

## Type Safety & API Integration

- **Auto-generated TypeScript client** from FastAPI OpenAPI schema
- **File watcher system** regenerates client when backend schema changes
- **End-to-end type safety** from API to UI components
- **Centralized client configuration** in `clientConfig.ts`

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

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Adaptive Layout**: Different layouts for mobile/desktop
- **Touch-friendly**: Appropriate touch targets
- **Dark Mode**: Built-in dark mode support

## Testing

### Frontend Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm coverage

# Run specific test file
pnpm test components/DocumentTree.test.tsx
```

### Test Structure

- **Component Tests**: Located in `__tests__/` directories
- **Integration Tests**: API integration and user workflow tests
- **E2E Tests**: End-to-end testing with Playwright/Cypress

## Performance Optimizations

- **Code Splitting**: Automatic by Next.js App Router
- **Image Optimization**: Next.js built-in optimizations
- **Bundle Analysis**: TypeScript checking at build time
- **Lazy Loading**: Components loaded as needed
- **Caching**: Intelligent document cache with TTL

## Production Deployment

### Build Configuration

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Analyze bundle size
pnpm analyze
```

### Deployment Options

- **Vercel**: Optimized for Next.js applications
- **Static Export**: For CDN deployment
- **Docker**: Containerized deployment
- **Edge Functions**: Vercel edge functions for dynamic content

## API Client Generation

The frontend automatically generates a TypeScript client when the backend schema changes:

1. Backend generates OpenAPI schema in `local-shared-data/openapi.json`
2. Frontend file watcher detects changes
3. `pnpm generate-client` creates type-safe API client
4. Components use fully typed API methods

## Development Workflow

1. Start backend server: `make start-backend`
2. Start frontend server: `make start-frontend`
3. Backend generates OpenAPI schema
4. Frontend auto-generates TypeScript client
5. Access application at `http://localhost:3000`

For comprehensive development guidance, see the main project `README.md` and `CLAUDE.md` files.