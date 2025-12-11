# AI Image Prompt Library (Arabic)

## Overview

An Arabic-first web application for discovering, creating, and sharing AI image generation prompts. The platform features a visual-heavy design with a masonry-style gallery showcasing prompt examples and AI-generated images. Users can browse prompts by category, search for specific prompts, and generate images using the Gemini AI model. The application emphasizes bilingual support (Arabic primary, English secondary) with full RTL (right-to-left) layout support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React SPA with TypeScript**
- Built using Vite as the build tool and development server
- TypeScript for type safety across the application
- Wouter for client-side routing (lightweight alternative to React Router)
- React Query (TanStack Query) for server state management and API caching

**UI Framework**
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom design system
- RTL-first layout configured in HTML (`dir="rtl"`)
- Dark mode support via theme context provider

**Component Structure**
- Page components in `client/src/pages/` (Home, NotFound)
- Reusable UI components in `client/src/components/`
- Shared UI primitives in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`

**State Management Strategy**
- Server state: React Query for API data fetching and caching
- Client state: React hooks (useState, useContext) for UI state
- Theme state: Context provider with localStorage persistence

**Design System**
- Typography: Tajawal (Arabic primary), Inter (English secondary) via Google Fonts
- Responsive grid: 1 column (mobile) → 2 columns (tablet) → 3-4 columns (desktop)
- Spacing primitives: Tailwind units (2, 4, 8, 12, 16)
- Color system: HSL-based with CSS custom properties for theme switching

### Backend Architecture

**Express.js REST API**
- TypeScript server running on Node.js
- HTTP server created with Node's `http` module
- API routes defined in `server/routes.ts`
- Static file serving for production builds

**API Endpoints**
- `GET /api/prompts` - Fetch all prompts
- `GET /api/prompts/:id` - Fetch single prompt by ID
- `POST /api/prompts` - Create new prompt (validated with Zod)
- `POST /api/prompts/:id/generate` - Generate image from prompt

**Data Layer**
- In-memory storage implementation (`MemStorage` class)
- Interface-based storage abstraction (`IStorage`) for future database migration
- Default prompts initialized on startup
- Data models: User, Prompt, GeneratedImage

**Validation**
- Zod schemas for runtime validation
- Drizzle-Zod integration for schema-driven validation
- Type-safe data models shared between client and server

**Build Process**
- Custom build script using esbuild for server bundling
- Vite for client bundling
- Server dependencies selectively bundled (allowlist approach) to optimize cold start times
- Production output: `dist/` directory

### Data Storage Solutions

**Current Implementation**
- In-memory storage using JavaScript Maps
- No database persistence (data lost on restart)
- Storage interface allows easy swap to database

**Prepared for Database Migration**
- Drizzle ORM configured with PostgreSQL dialect
- Schema definitions in `shared/schema.ts` using Drizzle's pg-core
- Database URL expected via `DATABASE_URL` environment variable
- Migration folder configured: `./migrations`

**Schema Design**
- Users table: id (UUID), username (unique), password
- Categories: Predefined array of 8 categories (nature, art, design, characters, fantasy, architecture, abstract, portrait)
- Prompts: id, title, promptText, description, category, generatedImageUrl, usageCount
- GeneratedImages: Tracked per prompt

### External Dependencies

**AI Integration**
- Google Gemini AI via `@google/genai` package
- Model: `gemini-2.5-flash-image` for image generation
- Configuration via environment variables:
  - `AI_INTEGRATIONS_GEMINI_API_KEY`
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`
- Response includes both text and image modalities
- Images returned as base64-encoded data URLs

**Third-Party Services**
- Google Fonts API for Tajawal and Inter fonts
- No authentication/authorization currently implemented (user schema exists but not used)

**Database (Configured but Not Active)**
- PostgreSQL via Drizzle ORM
- Connection pooling via `pg` package
- Session storage prepared: `connect-pg-simple` for Express sessions

**Development Tools**
- Replit-specific plugins for development environment:
  - Runtime error overlay
  - Cartographer for code navigation
  - Dev banner
- Hot Module Replacement (HMR) via Vite

**Key NPM Packages**
- UI: Radix UI components (@radix-ui/react-*)
- Forms: React Hook Form with Zod resolver
- Styling: Tailwind CSS with class-variance-authority
- State: TanStack React Query
- Utilities: date-fns, nanoid, clsx