# Morphing OS — Embodied Agent World

## Overview

Morphing OS is a dual-mode application combining a **3D Embodied Agent World** (the primary view) and a **Consciousness Fields Game** (toggled via header). The agent world simulates autonomous embodied agents that walk, socialize, and grow across named zones — including product zones that mirror a website's offerings. The app uses a dark, product-website aesthetic with a sidebar showing live agent stats, product zones, and messages.

### Modes
- **Agent World** (default): Autonomous agent simulation in a 3D world. Agents spawn, walk between zones, socialize, and evolve consciousness. Camera modes: Orbit / Follow / POV.
- **Game**: Original consciousness fields sandbox game with player avatar, NPCs, quests, and trait system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18 with TypeScript running in a Vite development environment. The application uses a modern monorepo structure with client-side code separated from server code.

**3D Rendering Engine**: Built on React Three Fiber (@react-three/fiber) which provides a React reconciler for Three.js. This allows declarative 3D scene composition using React components. Additional libraries include:
- @react-three/drei for helper components and utilities
- @react-three/postprocessing for visual effects
- GLSL shader support via vite-plugin-glsl

**UI Component System**: Utilizes Radix UI primitives wrapped with Tailwind CSS for styling. The design system implements a dark theme with customizable HSL color tokens. Key UI libraries:
- Full suite of Radix UI components for accessible, unstyled primitives
- Tailwind CSS for utility-first styling
- Custom CSS variables for theming
- Class Variance Authority (CVA) for component variants

**State Management**: Implements Zustand stores (referenced in imports) for global state management across different game systems:
- Consciousness field management
- Trait system
- NPC interactions
- Audio state
- Game state

**Input Handling**: Dual input system supporting both keyboard and gamepad controls:
- KeyboardControls from @react-three/drei for keyboard input
- Custom gamepad polling system with deadzone handling
- Unified control mapping for accessibility

### Backend Architecture

**Server Framework**: Express.js serving both API endpoints and static assets. The server is configured to:
- Handle JSON and URL-encoded request bodies
- Provide request/response logging with timing
- Support development hot-reloading via Vite middleware
- Serve the compiled React application in production

**Development vs Production**: The architecture separates concerns between development and production:
- Development: Vite dev server integrated as Express middleware with HMR support
- Production: Pre-built static assets served from dist/public
- Build process uses esbuild for server bundling and Vite for client bundling

**Module System**: ES modules throughout (type: "module" in package.json), using file URL imports for path resolution compatibility.

### Data Storage Solutions

**Database ORM**: Drizzle ORM configured for PostgreSQL via @neondatabase/serverless driver. The setup includes:
- Schema definitions in shared/schema.ts for code sharing between client and server
- Type-safe database operations with Zod schema validation
- Migration support through drizzle-kit
- Database credentials provided via DATABASE_URL environment variable

**Temporary Storage**: MemStorage class implements in-memory storage for development/testing:
- Map-based user storage
- Auto-incrementing IDs
- Implements IStorage interface for easy swapping with database implementation

**Client-Side Storage**: LocalStorage integration for:
- Game preferences and settings
- Instruction dismissal state
- Potentially player progress (referenced in utils)

### Authentication and Authorization

**Session Management**: Infrastructure prepared for session-based authentication:
- connect-pg-simple package for PostgreSQL session storage
- Express session middleware ready for implementation
- User schema includes username/password fields with Zod validation

**Current State**: Authentication system is scaffolded but not fully implemented. The storage interface includes user CRUD operations (getUser, getUserByUsername, createUser) that would support a login system.

### External Dependencies

**Database Service**: Neon Serverless PostgreSQL via @neondatabase/serverless
- Serverless-compatible PostgreSQL database
- Connection via DATABASE_URL environment variable
- Used with Drizzle ORM for type-safe queries

**Asset Management**: 
- Font loading via @fontsource/inter
- Support for 3D model formats (.gltf, .glb)
- Audio file support (.mp3, .ogg, .wav)
- Texture loading for terrain and materials

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal for enhanced error reporting
- TypeScript for type safety
- TSX for running TypeScript in development

**Third-Party UI Libraries**:
- TanStack React Query for async state management
- date-fns for date manipulation
- cmdk for command palette functionality
- Motion library (framer-motion) for animations
- React Day Picker for calendar UI
- Embla Carousel for carousel functionality
- Recharts for data visualization

**Game-Specific Dependencies**:
- Three.js ecosystem for 3D graphics
- nanoid for unique identifier generation
- Vaul for drawer components

### API Structure

**Route Organization**: Routes defined in server/routes.ts and registered with the Express app. All application routes are prefixed with /api to distinguish from static asset serving.

**Storage Interface**: The IStorage interface provides abstraction for data operations:
```typescript
- getUser(id): Retrieve user by ID
- getUserByUsername(username): Retrieve user by username
- createUser(user): Create new user
```

**Error Handling**: Global error handler middleware catches and formats errors with appropriate HTTP status codes, logging errors for debugging while returning sanitized messages to clients.

### Build and Deployment

**Build Scripts**:
- `dev`: Runs development server using tsx
- `build`: Compiles client (Vite) and server (esbuild) to dist directory
- `start`: Runs production build from dist
- `check`: TypeScript type checking
- `db:push`: Push database schema changes

**Asset Processing**: Vite handles client asset bundling with support for:
- Code splitting
- Asset optimization
- GLSL shader compilation
- Large file handling (3D models, audio)

**Path Resolution**: TypeScript path aliases configured for clean imports:
- `@/*` maps to client/src
- `@shared/*` maps to shared directory