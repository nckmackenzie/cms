# Repository Guidelines

## Project Overview
This is a church/parish financial management CMS (congregation, district, and group accounting: receipts, expenses, petty cash, budgets, fund requisitions, journal entries, chart of accounts). Built with TanStack Start (React) and TypeScript, backed by Postgres via Drizzle ORM.

## Project Structure & Module Organization
Main application code lives in `src/`, with routes in `src/routes`, shared UI in `src/components`, utilities in `src/lib`, hooks in `src/hooks`, and database code in `src/db`. Static assets live in `public/`. Generated artifacts include `.output/`, `.tanstack/`, `.content-collections/`, and `src/routeTree.gen.ts`; do not hand-edit those files.
`src/db/schema.ts` is the authoritative source for database structure and must be referenced whenever database schema details are needed.

## Build, Test, and Development Commands
Use `pnpm` for all local workflows.

- `pnpm dev`: start the Vite dev server on port `3000`.
- `pnpm build`: create a production build.
- `pnpm preview`: serve the built app locally.
- `pnpm test`: run Vitest in non-watch mode.
- `pnpm check`: run Biome formatting and lint checks.
- `pnpm lint` / `pnpm format`: run Biome linting or formatting only.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio`: manage Drizzle schema changes.

## Coding Style & Naming Conventions
Biome is the source of truth for formatting and linting. Use tabs for indentation and double quotes in TypeScript/TSX. Import path aliases `#/*` and `@/*` both resolve to `./src/*` — `#/` is the dominant convention in the codebase (used ~8x more often); prefer it in new code over `@/`.
Prefer PascalCase for React components (`ThemeToggle.tsx`), kebab-case for other files (`use-mobile.ts`, `member-table.tsx`), and colocate feature-specific code near its route when practical.
Do not use `any` type; always use `unknown` and type guard.
Avoid use of comments unless necessary to explain complex logic.

## File Organization
The app is structured around two main ideas: route-driven pages and feature-driven business code.

At the top level, routing is the backbone. `src/router.tsx` creates the TanStack Router and wires in TanStack Query. `src/routes/__root.tsx` is the global shell: it fetches the current session before route load, registers global UI providers, includes styles, and sets app-wide error/loading behavior. Route files use TanStack Router's flat, dot-delimited file naming (e.g. `finance.expenses.$expenseId.edit.tsx` for a nested `/finance/expenses/:expenseId/edit` route) rather than nested folders. From there, route groups split the app by audience:

- `src/routes/index.tsx` redirects users based on auth state.
- `src/routes/(auth)/*` holds unauthenticated pages: login, forgot-password, change-password.
- `src/routes/(authed)/route.tsx` is the authenticated shell (sidebar, header, breadcrumbs) for all back-office `finance.*` pages nested under it.
- `src/routes/api/*` contains server API route handlers (e.g. fund-requisition balance lookups).

Inside `src/`, most business logic is organized by feature slice under `src/features/*`. Each feature usually follows the same internal pattern:

- `components/`: UI for that feature
- `services/`: server functions (`*.api.ts`) and TanStack Query configs (`queries.ts` / `query.ts`)
- `utils/` (or `lib/`): feature-specific Zod schemas (`schema.ts` or `schemas.ts` — naming varies by feature, check the feature before assuming) and helpers

A good example is expenses:

- `src/routes/(authed)/finance.expenses.index.tsx` defines the page, search validation, and loader.
- `src/features/expenses/components/expenses-page.tsx` renders the actual page/table UI.
- `src/features/expenses/services/query.ts` defines a TanStack Query key factory (`expenseQueries`) with `queryOptions` per query.
- `src/features/expenses/services/expenses.api.ts` holds `createServerFn` server functions that query the database.
- `src/features/expenses/utils/schemas.ts` holds Zod validation for filters/forms.

So the usual flow is:

1. A route file in `src/routes` defines the page, search-param validation, and a loader that primes the query cache via `queryClient.ensureQueryData`.
2. The route renders feature components from `src/features/.../components`.
3. Those components call query configs (query-key-factory objects returning `queryOptions`) from `src/features/.../services/queries.ts`.
4. The query configs call server functions (`createServerFn().middleware([authMiddleware]).handler(...)`) in `*.api.ts`.
5. Those server functions read/write via Drizzle using the schema in `src/db/schema.ts` and the DB client in `src/db/index.ts`, and return a `Result<T, AppError>` (see `src/lib/result.ts`) rather than throwing on expected failure cases.

The rest of the repo supports that pattern:

- `src/components/ui/*`: shared reusable UI primitives (shadcn-based) and app shell pieces (sidebar, datatable, form fields, etc).
- `src/components/form-components.tsx`: shared TanStack Form field wrappers.
- `src/hooks/*`: cross-feature hooks — notably `use-form-upsert.tsx` (standard create/update mutation + toast + navigate flow) and `use-delete.ts`.
- `src/lib/*`: cross-cutting utilities — `auth.ts` (session management), `result.ts` (`Result`/`AppError` types), `journal.ts` and `banking.ts` (double-entry accounting helpers used by expenses/receipts/petty-cash/fund-requisitions), `db-helpers.ts`, `helpers.ts`, `constants.ts` (includes `MENU_ITEMS` sidebar config), `seo.ts`, `sms/africas-talking.ts`.
- `src/middleware/auth.ts`: `authMiddleware`, applied to server functions that require a logged-in user (`context.user`).
- `src/integrations/*`: framework integrations (TanStack Query provider/devtools, sheet provider).
- `src/db/*`: database schema, migrations, and seeds.

In short: `src/routes` decides where users go, `src/features` contains domain logic, `src/components/ui` is shared presentation, and `src/db` is the data layer.

### Auth
Authentication is a **custom** implementation, not the `better-auth` package (which is a dependency but currently unused). Sessions are DB-backed rows in the `sessions` table, referenced by a signed JWT (via `jose`) stored in an httpOnly cookie; see `src/lib/auth.ts` (`useAppSession`) and `src/features/auth/services/auth.api.ts`. Route/server protection goes through `src/middleware/auth.ts` (`authMiddleware`) on the server and `beforeLoad` checks in `src/routes/(authed)/route.tsx` on the client.
`src/components/ui/permission-gate.tsx` (`<PermissionGate hasAccess>`) exists as scaffolding for role/permission-based UI gating, but callers currently hardcode `hasAccess`; there is no wired-up role/permission-check system yet. Verify current state before relying on it for access control.

### Conventions worth knowing
- Public-facing record identifiers are `nanoid`-generated `publicId` strings; internal Postgres serial `id` values are not exposed to the client/URLs.
- Multi-step financial transactions (e.g. posting an expense) create matching journal entries and banking postings via `src/lib/journal.ts` / `src/lib/banking.ts` inside the same DB transaction — follow this pattern for any new money-movement feature rather than writing ledger rows ad hoc.

## Testing Guidelines
Vitest and Testing Library are installed and configured (`pnpm test`), but there are currently no test files in the repo. When adding tests, colocate them with the code they cover using `*.test.ts` or `*.test.tsx`, and focus on route behavior, auth flows, and database-backed logic before merging larger changes.

## Commit & Pull Request Guidelines
Use conventional prefixes like `feat:`, `fix:`, `refactor:`. Commit messages should be descriptive and concise. PRs should include a concise description, linked issue or task if applicable, screenshots for UI changes, notes for schema or env changes, and confirmation that `pnpm check` and `pnpm test` passed.

## Security & Configuration Tips
Keep secrets in `.env.local`; do not commit credentials. Review `src/lib/auth.ts` and `src/middleware/auth.ts` before changing auth behavior — see the Auth section above for how session handling actually works. If you touch schema or auth configuration, document required environment variables and migration steps in the PR.
