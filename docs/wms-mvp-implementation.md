# WMS MVP Implementation Notes

This file is a historical phase log for the initial scaffold and early MVP slices. It does not mean the standalone WMS is production-complete.

Current production readiness and remaining gaps are tracked in:

- `docs/wms-gap-analysis.md`
- `docs/wms-production-blueprint.md`

Treat any `Status: completed` entries below as "that early implementation slice was completed and validated at the time", not as a claim that the WMS product is complete.

## Phase 1 - Warehouse foundation

Status: completed.

### Files changed

- Added a standalone Next.js, TypeScript, Prisma, Tailwind, and Vitest scaffold.
- Added Prisma schema and seed data for support entities and WMS entities.
- Added WMS app shell, navigation, dashboard placeholder, warehouse page, and location page.
- Added warehouse and warehouse-location API route handlers.
- Added server helpers for database access, request context, permissions, store access, audit logs, and errors.

### Behavior added

- Store-scoped warehouse CRUD.
- Store-scoped warehouse location CRUD.
- Location code, barcode, type, active/inactive status, and pickable/receivable/sellable flags.
- WMS role permissions with server-side checks.
- Audit log writes for warehouse and location create/update/deactivate actions.

### Validation

- `pnpm install` passed.
- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- No stock-changing operations are implemented in Phase 1.
- Store isolation is enforced in warehouse and location services.
- Permissions are enforced in service methods.
- Movement ledger is modeled but not exposed yet.
- No enterprise WMS features were added.
- Phase 1 does not expose direct stock mutation from API routes or UI components.

### Risks and assumptions

- This is a standalone WMS product repository. It is not an integration into another platform.
- This workspace started empty, so Phase 1 includes project scaffolding.
- PostgreSQL is the intended database. A real `DATABASE_URL` is required for migrations and runtime API use.
- This directory is not a git repo, so commits are skipped.
- `pnpm install` reported that the pinned Next.js version is deprecated with a security warning. Validation still passes; this should be revisited before production deployment.

### Next phase

- Phase 2: inventory balances, append-only movements, and central stock movement service.

## Phase 2 - Inventory balances and movement ledger

Status: completed.

### Files changed

- Added `StockMovementService` and stock movement engine helpers.
- Added location-balance and inventory-movement list APIs.
- Added inventory balance and movement history UI pages.
- Added tests for stock increase planning, transfer-like movement planning, negative stock prevention, explicit admin negative adjustment, store isolation, and base variant keys.
- Marked API routes as dynamic because auth/store context reads request headers.

### Behavior added

- Central transactional stock movement service updates balances and appends movement history.
- No public movement mutation route is exposed; mutation is service-only.
- Balance queries support warehouse, location, and product filters.
- Movement history is append-only by API design and rendered in the WMS UI.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- Stock-changing logic is centralized in `StockMovementService`.
- Balance changes and movement creation run in one Prisma transaction.
- Movement history has create-only service behavior in this phase.
- Store isolation is checked for products, variants, and locations before mutation.
- Negative stock is blocked unless the caller is an admin making an explicit manual adjustment.
- No direct stock mutation was added to routes or components.

### Risks and assumptions

- Runtime stock mutations require PostgreSQL and a valid `DATABASE_URL`.
- Row-level locking is used when an existing balance row is present. New balance rows rely on the unique balance key and transaction boundary.
- The Next.js package security warning from Phase 1 remains unresolved.

### Next phase

- Phase 3: receiving sessions, receiving lines, receive movement, and put-away flow.

## Phase 3 - Receiving and put-away

Status: completed.

### Files changed

- Added receiving services and receiving validation rules.
- Added product list API for WMS product selection/scanning.
- Added receiving session, receiving line, receive, complete, and put-away APIs.
- Added scanner-compatible receiving and put-away UI pages.
- Added tests for receiving location rules, completed-session protection, put-away destination rules, and put-away availability checks.
- Refactored `StockMovementService` so stock movement can run inside an outer transaction.

### Behavior added

- Receiving sessions can be created against an active RECEIVING location.
- Receiving lines can be added and received into the session receiving location.
- Each receive operation creates a `RECEIVE` movement through `StockMovementService`.
- Sessions can be completed only after all lines are received.
- Put-away moves stock from RECEIVING to STORAGE/PICKING with a `PUTAWAY` movement.
- Scanner inputs accept keyboard-scanner SKU/barcode submissions.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- Receiving and put-away stock changes go through `StockMovementService`.
- Receiving line update and stock movement are wrapped in one transaction.
- Put-away source decrement and destination increment are wrapped in one transaction.
- Store isolation is enforced by service lookups and stock movement validation.
- No purchase-order integration was added.
- No enterprise receiving features were added.

### Risks and assumptions

- Product data is minimal in the standalone app; seeded products are enough for MVP flows.
- Receiving uses expected quantity as a cap when it is greater than zero.
- The Next.js package security warning remains unresolved.

### Next phase

- Phase 4: internal transfers and stock adjustments.

## Phase 4 - Transfers and stock adjustments

Status: completed.

### Files changed

- Added transfer and adjustment services.
- Added transfer and adjustment APIs.
- Added scanner-friendly transfer and adjustment UI pages.
- Added adjustment rule helpers and tests.

### Behavior added

- Internal transfers scan/select source location, product, destination location, and quantity.
- Transfers create `TRANSFER` movements through `StockMovementService`.
- Stock adjustments create `ADJUSTMENT` movements through `StockMovementService`.
- Supported adjustment reasons: `DAMAGED`, `LOST`, `FOUND`, `COUNT_CORRECTION`, `MANUAL_CORRECTION`, `EXPIRED`, `RETURNED_TO_STOCK`.
- Manual corrections require a note.
- Negative stock remains blocked except explicit admin manual correction.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- Transfer and adjustment stock changes go through `StockMovementService`.
- Source/destination balance changes and movement creation run in transactions.
- Movement ledger remains append-only.
- Permission checks are enforced at service level.
- Store isolation is enforced by stock movement validation.
- No direct stock mutation was added to API routes or UI.

### Risks and assumptions

- The adjustment UI exposes the explicit negative correction flag, but service-side rules still restrict it to admin manual corrections.
- The Next.js package security warning remains unresolved.

### Next phase

- Phase 5: cycle count sessions, count entry, approval, and correction movement.

## Phase 5 - Cycle counts

Status: completed.

### Files changed

- Added cycle count service and cycle count rule helpers.
- Added cycle count list/create/count-line/submit/approve APIs.
- Added cycle count UI for session creation, count entry, submission, and approval.
- Added tests for expected-count differences, counted quantity validation, submit readiness, and approval state rules.

### Behavior added

- Cycle counts snapshot current expected quantity by warehouse location.
- Counted quantities can be entered while a session is `COUNTING`.
- Counts must be submitted before approval.
- Approval creates `CYCLE_COUNT_CORRECTION` movements through `StockMovementService` only for non-zero differences.
- Audit logs are written for create, count entry, submit, and approve actions.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- Cycle count approval is the only stock-changing step, and it uses `StockMovementService`.
- Approval corrections are transactional with session approval.
- No stock changes happen when counts are created, counted, or submitted.
- Approval is permission-gated with `WMS_APPROVE_CYCLE_COUNT`.
- Store isolation is enforced through scoped session and line lookups.

### Risks and assumptions

- If stock changes between snapshot and approval, correction may be blocked by negative-stock protection.
- Empty-location counts are allowed to be created but cannot be submitted because there are no lines.
- The Next.js package security warning remains unresolved.

### Next phase

- Phase 6: simple picking work from customer orders.

## Phase 6 - Simple picking

Status: completed.

### Files changed

- Added picking rule helpers and tests.
- Added order listing service/API.
- Added warehouse work list/create and pick-confirm APIs.
- Added picking service for `warehouse_work` and `warehouse_work_lines`.
- Added picking UI for creating pick work from orders and confirming location/product/quantity.
- Added a sample customer order to seed data.

### Behavior added

- Pick work is created as a header with executable lines from customer orders.
- Pick line source location is selected from active pickable stock balances.
- Pick confirmation requires matching source location scan, product scan, and quantity.
- Picked stock is decremented through `StockMovementService` with `PICK` movements.
- Work line and work header statuses update as lines are picked.
- Source order status moves to `PICKING`, then `PICKED` when all work lines complete.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- Pick stock changes go through `StockMovementService`.
- Pick movement, line update, work header update, and order status update run in one transaction.
- Store isolation is enforced through scoped order/work lookups and stock movement validation.
- The model uses `warehouse_work` and `warehouse_work_lines`, not a flat task table.
- No wave, batch, route optimization, packing, or shipping-label features were added.

### Risks and assumptions

- MVP source-location selection chooses one pickable balance that can fully satisfy an order line; it does not split one order line across multiple bins.
- No reservation/allocation state is implemented.
- The Next.js package security warning remains unresolved.

### Next phase

- Phase 7: dashboard, final tests, documentation, and polish.

## Phase 7 - Dashboard, tests, documentation, and polish

Status: completed.

### Files changed

- Added WMS dashboard service and dashboard API.
- Replaced dashboard placeholder with live operational dashboard UI.
- Expanded permission tests.
- Added `.gitignore` and disabled TypeScript incremental output to avoid generated source-tree artifacts.
- Re-ran full validation after cleanup.

### Behavior added

- Dashboard metrics show active warehouses, active locations, units on hand, pending receiving, pending put-away, pending picking, and stock discrepancies.
- Dashboard panels show recent movements, pending receiving sessions, receiving stock awaiting put-away, pending pick work, and count discrepancies.
- Final UI pass keeps all WMS pages under the shared app shell and store-scoped APIs.

### Validation

- `pnpm prisma:generate` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.

### Self-review

- All stock-changing operations route through `StockMovementService`.
- Stock-changing operations run in Prisma transactions.
- Movement ledger remains append-only from public APIs and services.
- Store isolation is enforced by request context, store access checks, scoped lookups, and stock movement validation.
- Permissions are enforced server-side per service.
- No non-MVP enterprise WMS features were added.
- Existing standalone product, order, inventory, warehouse, and tenant behavior was preserved.

### Risks and assumptions

- Runtime operation requires PostgreSQL, `DATABASE_URL`, migrations, and seed data.
- The app uses a simple header/fallback request context for MVP auth, not production authentication.
- `pnpm install` still resolves Next.js 14 to 14.2.23 and reports a security/deprecation warning. A production deployment should perform a deliberate Next/React major upgrade pass.
- Vitest also reports a Vite CJS Node API deprecation warning, but tests pass.
- This directory is not a git repo, so no commits were created.

### Final status

- WMS MVP phases 1-7 are implemented in the standalone `/Users/ilias_iangurazov/Commercial/wms` workspace.

## Local database

- Added `docker-compose.yml` with a local PostgreSQL 16 service matching `.env.example`.
- Start database: `pnpm db:up`.
- Apply schema: `pnpm prisma:migrate`.
- Seed MVP data: `pnpm prisma:seed`.
- Stop database: `pnpm db:down`.
- `pnpm prisma:seed` loads `.env` through Node's `--env-file=.env` flag.
- Initial migration created: `prisma/migrations/20260521100245_init/migration.sql`.
