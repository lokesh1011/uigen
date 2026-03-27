# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates them in real-time using a virtual file system. The generated components are shown in a live Monaco editor and Babel-compiled preview.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development (Next.js + Turbopack)
npm run dev

# Build for production
npm run build

# Run tests (Vitest)
npm test

# Run a single test file
npx vitest src/path/to/file.test.ts

# Lint
npm run lint

# Reset database (destructive)
npm run db:reset
```

> **Note:** On Windows, `npm run dev` uses `set NODE_OPTIONS=...`. On Unix, the other scripts use `export` syntax. The `node-compat.cjs` shim is required for all Next.js commands.

## Environment Variables

Create a `.env` file at the root:
```
ANTHROPIC_API_KEY=your_key_here
JWT_SECRET=your_jwt_secret
```

If `ANTHROPIC_API_KEY` is missing, the app falls back to `MockLanguageModel` in `src/lib/provider.ts`, which returns static demo components (Counter, ContactForm, Card).

## Architecture

### Data Flow

1. User submits a message → `ChatInterface` → `POST /api/chat`
2. `/api/chat/route.ts` streams a response using the Vercel AI SDK + Claude (`claude-haiku-4-5`)
3. Claude calls tools (`str_replace_editor`, `file_manager`) to create/edit files
4. Tool calls mutate the `VirtualFileSystem` (in-memory, no disk I/O)
5. The virtual FS state is held in `FileSystemContext` and displayed by `FileTree` + `CodeEditor`
6. `PreviewFrame` compiles JSX with Babel Standalone and renders the component in a live preview
7. For authenticated users, the virtual FS is serialized and persisted to SQLite via Prisma

### Key Directories

- `src/app/api/chat/route.ts` — Claude integration entry point; streams AI responses with tool use
- `src/lib/provider.ts` — Selects real Claude model vs. mock; model is `claude-haiku-4-5`
- `src/lib/file-system.ts` — `VirtualFileSystem` class (in-memory file tree)
- `src/lib/tools/` — AI tool definitions: `str_replace_editor` (create/edit files) and `file_manager` (create/delete)
- `src/lib/prompts/` — System prompt for component generation
- `src/lib/contexts/` — `ChatContext` (message state) and `FileSystemContext` (virtual FS state)
- `src/lib/transform/jsx-transformer.ts` — Babel-based runtime JSX compilation for preview
- `src/components/preview/PreviewFrame.tsx` — Renders compiled component output
- `src/components/editor/` — Monaco editor + file tree UI
- `src/components/chat/` — Chat interface components
- `src/actions/` — Next.js server actions for project CRUD
- `src/lib/auth.ts` — JWT session management (Jose + bcrypt)
- `src/middleware.ts` — Auth protection for routes
- `prisma/schema.prisma` — SQLite schema: `User` and `Project` models

### Tech Stack

- **Next.js 15** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS v4**, **shadcn/ui** (Radix UI components)
- **Vercel AI SDK** (`ai` v4) + **`@ai-sdk/anthropic`** for Claude streaming
- **Monaco Editor** (`@monaco-editor/react`) for code editing
- **Babel Standalone** for runtime JSX compilation in the preview
- **Prisma** ORM with **SQLite** (`prisma/dev.db`)
- **Vitest** + **@testing-library/react** with jsdom for tests

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
