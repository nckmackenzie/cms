# Repository Guidelines

## Project Structure & Module Organization
This repository is a TanStack Start app written in TypeScript. Main application code lives in `src/`, with routes in `src/routes`, shared UI in `src/components`, utilities in `src/lib`, hooks in `src/hooks`, and database code in `src/db`. Static assets live in `public/`. Generated artifacts include `.output/`, `.tanstack/`, `.content-collections/`, and `src/routeTree.gen.ts`; do not hand-edit those files.
`src/db/schema.ts` is the authoritative source for database structure and must be referenced whenever database schema details are needed.
Static assets and logos are in `public/`.

## Build, Test, and Development Commands
Use `pnpm` for all local workflows.

- `pnpm dev`: start the Vite dev server on port `3000`.
- `pnpm build`: create a production build.
- `pnpm preview`: serve the built app locally.
- `pnpm test`: run Vitest in non-watch mode.
- `pnpm check`: run Biome formatting and lint checks.
- `pnpm lint` / `pnpm format`: run Biome linting or formatting only.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`: manage Drizzle schema changes.

## Coding Style & Naming Conventions
Biome is the source of truth for formatting and linting. Use tabs for indentation and double quotes in TypeScript/TSX. Keep route files aligned with TanStack Router naming patterns such as `index.tsx`, `route.tsx`, and `api/auth/$.ts`. Prefer PascalCase for React components (`ThemeToggle.tsx`), camelCase for utilities and hooks (`use-mobile.ts`, `auth-client.ts`), and colocate feature-specific code near its route when practical.
Do not use `any` type; always use `unknown` and type guard.
Avoid use of comments unless necessary to explain complex logic.

## File Organization
The app is structured around two main ideas: route-driven pages and feature-driven business code.
At the top level, routing is the backbone. src/router.tsx creates the TanStack Router and wires in TanStack Query.
src/routes/__root.tsx is the global shell: it fetches the current session before route load, registers global UI
providers, includes styles, and sets app-wide error/loading behavior. From there, route groups split the app by
audience:

  - src/routes/index.tsx redirects users based on auth state and role.
  - src/routes/(authed)/route.tsx is the authenticated staff/admin shell with sidebar, header, and nested back-office pages.
  - src/routes/api/* contains server endpoints such as auth callbacks and payment/webhook handlers.

Inside src/, most business logic is organized by feature slice under src/features/*. Each feature usually follows the
same internal pattern:

  - components/: UI for that feature
  - services/: server functions, query definitions, validation schemas, helpers
  - hooks/ or lib/: feature-specific hooks/utilities when needed

  A good example is members:

  - src/routes/app/members/index.tsx defines the page, permission check, search validation, loader, and page
    composition.
  - src/features/members/components/member-table.tsx renders the actual table UI.
  - src/features/members/services/queries.ts defines TanStack Query configs.
  - src/features/members/services/members.queries.api.ts holds server functions that query the database.
  - src/features/members/services/schemas.ts holds Zod validation for filters/forms.

  So the usual flow is:

  1. A route file in src/routes defines the page and route guards.
  2. The route renders feature components from src/features/.../components.
  3. Those components call query configs from src/features/.../services/queries.ts.
  4. The query configs call server functions in *.api.ts.
  5. Those server functions read/write via Drizzle using the schema in src/db/schema.ts and the DB client in src/db/index.ts.

  The rest of the repo supports that pattern:

  - src/components/ui/*: shared reusable UI primitives and app shell pieces.
  - src/components/form-components/*: form field wrappers.
  - src/lib/*: cross-cutting utilities like auth, permissions, session handling, S3, SMS, error helpers, etc.
  - src/lib/auth/index.ts: Better Auth setup.
  - src/lib/permissions/permissions.ts and src/middlewares/auth-middleware.ts: route/server protection.
  - src/integrations/*: framework integrations like query provider, modal provider, sheet provider.
  - src/db/*: database schema, migrations, and seeds.
  - src/services/*: a few app-wide service modules that aren’t tied to one feature.

  In short: src/routes decides where users go, src/features contains domain logic, src/components/ui is shared
  presentation, and `src/db` is the data layer.

## Testing Guidelines
Vitest and Testing Library are installed. Add tests next to the code they cover using `*.test.ts` or `*.test.tsx`. Focus tests on route behavior, auth flows, and database-backed logic before merging larger changes. Run `pnpm test` locally and include any missing coverage notes in the PR if a change is hard to automate.

## Commit & Pull Request Guidelines
Use of conventional prefixes like `feat:`. Follow that pattern: commit message should be descriptive and concise. PRs should include a concise description, linked issue or task if applicable, screenshots for UI changes, notes for schema or env changes, and confirmation that `pnpm check` and `pnpm test` passed.

## Security & Configuration Tips
Keep secrets in `.env.local`; do not commit credentials. Review `src/lib/auth.ts`, `src/lib/auth-client.ts`, and `drizzle.config.ts` before changing auth or database behavior. If you touch schema or auth configuration, document required environment variables and migration steps in the PR.
