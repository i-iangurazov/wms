# WMS Operational Hardening Plan

This document treats the current repository as a standalone WMS product. It is deliberately strict: a table, API handler, or UI screen is not considered operational unless a warehouse user scenario works end to end, with stock safety, tenant isolation, permissions, Russian UX, and tests.

## Current Codebase Snapshot

- Stack: Next.js App Router, TypeScript, Prisma/PostgreSQL, Tailwind, Vitest.
- Auth/session: email + password login, HTTP-only session cookie, `UserSession`, middleware guard for `/wms` and non-public `/api`, dev fallback behind `ALLOW_DEV_AUTH_FALLBACK`.
- Tenant boundary: `Store` is currently the company/organization tenant model; most WMS tables carry `storeId`.
- Roles: `OWNER`, `ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_WORKER`, `VIEWER`, plus legacy `MANAGER`, `STAFF`, `CASHIER`.
- Core stock safety: `StockMovementService` updates balances and appends `InventoryMovement` inside transactions.
- UI: Russian-first WMS screens exist for products, warehouses, locations, receiving, put-away, replenishment, transfers, picking, packing, counts, inventory, movements, audit, settings.
- Tests: unit tests for stock movement engine/rules, auth fallback, permissions, barcode resolution, product/order rules, scanner flow contracts, plus a DB smoke script.
- Documentation: production blueprint, gap analysis, reference alignment, and MVP implementation notes exist.

## Module Gap Analysis

### 1. Authentication And Security

What currently exists:
- `src/server/session.ts` authenticates email/password and creates a `UserSession`.
- `src/middleware.ts` blocks unauthenticated WMS/API requests when dev fallback is disabled.
- `src/server/permissions.ts` maps roles to WMS permissions.
- `src/server/services/userService.ts` lets admins create users with an initial password.
- `src/app/login/page.tsx`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/context/route.ts`.

What is shallow:
- Login has no rate limiting or lockout.
- Organization switch updates the existing session instead of rotating the session token.
- Navigation is not role-aware; users can see pages they cannot use.
- No protected route matrix tests.
- No explicit activation/password reset workflow beyond initial admin password.

Real scenario:
- An owner creates a warehouse worker, gives a temporary password, the worker logs in, sees only permitted WMS modules, and cannot access forbidden APIs. Repeated bad login attempts are throttled. Switching organization rotates the session token.

Files to change:
- `prisma/schema.prisma`
- new migration under `prisma/migrations/**`
- `src/server/session.ts`
- `src/server/loginRateLimit.ts`
- `src/server/routeAccess.ts`
- `src/server/routeAccess.test.ts`
- `src/server/loginRateLimit.test.ts`
- `src/middleware.test.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/context/route.ts`
- `src/components/AppShell.tsx`
- `src/lib/wmsText.ts`

Acceptance criteria:
- Failed login attempts are stored and blocked after a configured threshold.
- Successful login records a success attempt and resets practical attack feedback.
- Organization switch creates a new session token and invalidates the old one.
- WMS navigation hides links the current role cannot use.
- Tests cover public/private routes, login redirects, API 401 behavior, and role navigation.

Tests to add:
- Rate-limit policy tests for threshold, window, and successful attempt behavior.
- Middleware protected-route matrix tests.
- Role-aware navigation tests.

### 2. Products And Barcodes

What currently exists:
- `Product` and `ProductVariant` have one optional `barcode` each.
- `src/server/services/productService.ts` supports CRUD and variant CRUD.
- `src/server/services/barcodeService.ts` resolves product/location/order/work scans.
- `src/app/wms/products/page.tsx`.

What is shallow:
- No CSV/XLSX import.
- No barcode label registry.
- Only one barcode per product/variant; no supplier barcodes or aliases.
- No ambiguity/conflict resolution screen.
- No location/product label export.

Real scenario:
- A manager imports products from CSV, assigns multiple product/variant barcodes, resolves duplicate barcode conflicts before import, exports product and location labels, and warehouse workers scan the labels reliably.

Files to change:
- `prisma/schema.prisma`
- migrations for `barcode_labels` or `product_barcodes`
- `src/server/services/productImportService.ts`
- `src/server/services/barcodeLabelService.ts`
- `src/server/services/barcodeService.ts`
- `src/app/api/products/import/route.ts`
- `src/app/api/barcode-labels/route.ts`
- `src/app/wms/products/page.tsx`
- `src/app/wms/settings/page.tsx`

Acceptance criteria:
- CSV product import validates required columns and reports row-level Russian errors.
- Multiple barcodes can be registered per product, variant, and location.
- Duplicate/ambiguous barcode attempts are blocked with a resolver response.
- Label export returns printable CSV/HTML foundation for products and locations.

Tests to add:
- Import success and failure-path tests.
- Barcode conflict and ambiguity tests.
- Cross-tenant barcode lookup tests.

### 3. Receiving

What currently exists:
- `ReceivingSession`, `ReceivingLine`, expected and received quantities.
- `src/server/services/receivingService.ts` creates sessions, lines, receives stock, completes sessions.
- Receive movement goes through `StockMovementService`.
- Receive commands support idempotency keys.
- `src/app/wms/receiving/page.tsx`.

What is shallow:
- No supplier model or purchase/ASN reference model.
- Over-receipt is blocked, not configurable.
- Under-receipt is only represented as incomplete lines; no close-with-shortage workflow.
- Damaged receipt is not separated from good stock.
- Unknown barcode flow is not operational.
- Receiving labels are missing.
- Completing requires all lines to be fully received, which blocks real partial deliveries.

Real scenario:
- A worker opens a receipt with expected items, scans products, records good and damaged quantities, handles unknown barcodes, closes with under/over-receipt decisions, and prints receiving labels. Stock changes remain idempotent.

Files to change:
- `prisma/schema.prisma`
- `src/server/services/receivingService.ts`
- `src/server/services/receivingRules.ts`
- `src/server/services/barcodeService.ts`
- `src/app/api/receiving/**`
- `src/app/wms/receiving/page.tsx`

Acceptance criteria:
- Expected vs actual is visible and stored.
- Under-receipt can be closed with a reason and audit log.
- Over-receipt is controlled by warehouse rule/permission.
- Damaged receipt records unavailable stock state or damaged location movement.
- Unknown barcode path creates a clear Russian exception state without mutating stock.
- Repeat scan/submit with the same idempotency key does not duplicate stock.

Tests to add:
- Expected, exact, under, and over receipt tests.
- Damaged receipt test.
- Unknown barcode failure test.
- Idempotent receive route/service test.

### 4. Put-Away

What currently exists:
- `src/server/services/putawayService.ts` directly moves stock from a receiving location to a destination.
- `WarehouseWorkType.PUTAWAY` exists in the enum but is not meaningfully generated.
- `src/app/wms/put-away/page.tsx`.

What is shallow:
- No generated put-away work lines from receiving lines.
- No suggested destination based on location directives, zones, or capacity.
- No partial put-away history per receiving line.
- No capacity checks.

Real scenario:
- After receiving, the system creates executable put-away tasks. A worker scans receiving/source location, product, destination, and quantity. The system suggests a destination, permits partial put-away, checks capacity, and records history per receiving line.

Files to change:
- `prisma/schema.prisma`
- `src/server/services/putawayService.ts`
- `src/server/services/warehouseRuleService.ts`
- `src/app/api/put-away/route.ts`
- `src/app/wms/put-away/page.tsx`

Acceptance criteria:
- Receiving completion or manual action generates `PUTAWAY` work lines.
- A put-away line can be partially completed.
- Destination must be active, compatible, and within capacity when capacity exists.
- Put-away movement references work line and/or receiving line.

Tests to add:
- Generated put-away work from received line.
- Partial put-away success.
- Capacity exceeded failure.
- Wrong destination type failure.

### 5. Reservation And Allocation

What currently exists:
- Balance fields include `reservedQty` and `pickedQty`.
- `CustomerOrder` and `CustomerOrderLine` exist.
- `OrderStatus.ALLOCATED` exists but is not backed by allocation records.

What is shallow:
- No allocation/reservation table.
- Pick work picks from balances directly.
- No split-bin allocation.
- No double-allocation prevention.
- No reservation release on cancel.

Real scenario:
- A manager allocates an order before picking. The system reserves available stock by location, can split one order line across multiple bins, prevents another order from reserving the same stock, and releases reservations if cancelled.

Files to change:
- `prisma/schema.prisma`
- `src/server/services/allocationService.ts`
- `src/server/services/orderService.ts`
- `src/server/services/pickingService.ts`
- `src/server/services/stockMovementService.ts`
- `src/app/api/orders/**`
- `src/app/wms/picking/page.tsx`

Acceptance criteria:
- `inventory_allocations` or equivalent records exist.
- Allocation increments `reservedQty` transactionally through the stock service or a stock-state service boundary.
- Pick work is generated from allocations, not raw balances.
- One order line can create multiple pick work lines from different locations.
- Cancelling/releasing allocation decrements `reservedQty`.

Tests to add:
- Allocate from one bin.
- Split allocation across bins.
- Prevent double allocation.
- Release reservation on cancel.
- Cross-tenant allocation blocked.

### 6. Picking

What currently exists:
- `src/server/services/pickingService.ts` creates pick work from orders and confirms pick lines.
- `WarehouseWork` + `WarehouseWorkLine` are used.
- Wrong location/product scan checks exist in rules.
- `src/app/wms/picking/page.tsx`.

What is shallow:
- Pick work is generated from a single location that can satisfy the whole line.
- No allocation-backed split-bin picks.
- Short-pick is only a line exception string; no resolution workflow.
- Picked stock policy does not consistently transition from reserved to picked.
- Scan retry/error states are shallow UI banners.

Real scenario:
- A worker picks a multi-line order from multiple bins, scans each source and item, cannot pick more than allocated/available, can record a short pick, and the manager resolves partial pick before packing.

Files to change:
- `src/server/services/pickingService.ts`
- `src/server/services/pickingRules.ts`
- `src/server/services/allocationService.ts`
- `src/app/api/warehouse-work/**`
- `src/app/wms/picking/page.tsx`

Acceptance criteria:
- Pick work lines are generated from allocations.
- Wrong location/product scan returns Russian error and does not mutate stock.
- Short-pick marks line/work/order as requiring review.
- Completed lines cannot be picked again.
- Pick movement updates physical/picked/reserved policy consistently.

Tests to add:
- Multi-line, split-bin pick success.
- Wrong location and wrong product failure.
- Short-pick workflow and review state.
- Idempotent pick confirmation.

### 7. Packing And Shipping Foundation

What currently exists:
- `WarehouseWorkType.PACK` and `OrderStatus.PACKED/READY_TO_SHIP` exist.
- `src/server/services/packingService.ts`, `/api/packing`, and `/wms/packing` exist.

What is shallow:
- Packing is work-line based but has no explicit packing session/container model.
- Mistakes/exceptions are basic.
- No packed contents audit beyond work/movement audit.
- No carrier integration by design.

Real scenario:
- After picking, a packer verifies picked items, catches missing/wrong items, marks an order packed, and hands it to shipping.

Files to change:
- `prisma/schema.prisma`
- `src/server/services/packingService.ts`
- `src/app/api/packing/route.ts`
- `src/app/wms/packing/page.tsx`

Acceptance criteria:
- Packing session records verified lines and exception state.
- Packed order cannot be packed twice.
- Ready-to-ship handoff is auditable.

Tests to add:
- Pack verified order.
- Wrong item/quantity failure.
- Duplicate pack prevention.

### 8. Cycle Count

What currently exists:
- `CycleCountSession` and `CycleCountLine` snapshot expected quantities.
- `src/server/services/cycleCountService.ts` supports count, submit, approve, reject.
- Approval creates movement corrections.
- `src/app/wms/cycle-counts/page.tsx`.

What is shallow:
- No blind count option.
- No recount history.
- Unexpected item during count is not modeled.
- Missing item can be inferred but lacks a clear worker flow.
- Approval/rejection audit exists but needs full scenario tests.

Real scenario:
- A worker performs a blind count, scans unexpected items, marks missing items, submits for review, and a manager approves or rejects with audit history. No stock changes before approval.

Files to change:
- `prisma/schema.prisma`
- `src/server/services/cycleCountService.ts`
- `src/server/services/cycleCountRules.ts`
- `src/app/api/cycle-counts/**`
- `src/app/wms/cycle-counts/page.tsx`

Acceptance criteria:
- Blind count can hide expected quantities from worker UI.
- Recounts are recorded without losing prior count attempts.
- Unexpected item can be added to the session.
- Approval/rejection logs user, time, and reason.

Tests to add:
- Blind count payload/UI contract.
- Unexpected item count.
- Recount history.
- Approval and rejection audit assertions.

### 9. Replenishment

What currently exists:
- `ReplenishmentRule`, min/max, source/destination locations/zones.
- `src/server/services/replenishmentService.ts`.
- `src/app/wms/replenishment/page.tsx`.

What is shallow:
- Generation is manual/API-driven rather than scheduled.
- Priority queue exists mostly as sorting, not operational task priority.
- Insufficient source stock handling needs clearer exception workflow.
- Execution is not tied to allocation/picking demand.

Real scenario:
- Pick location stock drops below min; system generates replenishment work from storage to picking, prioritizes tasks, handles insufficient source stock, and workers execute with scans.

Files to change:
- `src/server/services/replenishmentService.ts`
- `src/server/services/warehouseRuleService.ts`
- `src/app/api/replenishment/route.ts`
- `src/app/wms/replenishment/page.tsx`
- optional scheduled command under `scripts/`.

Acceptance criteria:
- Manual and command-driven generation create executable work.
- Low pick stock generates a correct suggested replenishment quantity.
- Source stock shortage creates a review state, not a fake success.

Tests to add:
- Rule generation success.
- Priority sorting.
- Insufficient source stock failure/review.
- Execution movement test.

### 10. Real Test Coverage

What currently exists:
- Vitest unit tests for rules and core services.
- DB smoke script exists but is not an end-to-end browser test.

What is shallow:
- No route handler tests for most APIs.
- No browser/mobile/scanner E2E tests.
- Cross-tenant route tests are incomplete.
- Audit assertions are spotty.

Real scenario:
- CI proves that a user can log in, receive, put away, allocate, pick, pack, count, and view movement history, and that forbidden cross-tenant access fails.

Files to change:
- `vitest.config.ts`
- `src/app/api/**/*.test.ts` or route test harness.
- `e2e/**` if Playwright is added.
- `scripts/wms-workflow-smoke.ts`.

Acceptance criteria:
- Protected route matrix test exists.
- Route tests cover success and permission failure for critical APIs.
- E2E/test harness covers scanner flows at least in happy-path and key failure-path form.

Tests to add:
- Login route success/failure/rate limit.
- Cross-tenant API route access.
- Browser or Playwright scanner flow tests.
- Audit log assertions for receiving, put-away, allocation, pick, pack, count.

### 11. Production Readiness

What currently exists:
- `docker-compose.yml` for Postgres.
- `/api/health` exists.
- `.env.example`.

What is shallow:
- No production Dockerfile.
- No deployment runbook.
- No backup/restore runbook.
- No structured logging.
- No migration deployment process doc.
- No security checklist.

Real scenario:
- An operator can build and deploy the app, run migrations safely, check health, back up/restore the database, and understand security limitations.

Files to change:
- `Dockerfile`
- `.dockerignore`
- `docs/deployment-runbook.md`
- `docs/backup-restore-runbook.md`
- `src/server/logger.ts`
- `src/app/api/health/route.ts`

Acceptance criteria:
- Production image builds.
- Healthcheck reports app and DB status.
- Runbooks provide exact commands for deploy, migrate, backup, and restore.
- Security checklist documents secrets, cookies, rate limits, HTTPS, backups, and admin creation.

Tests to add:
- Healthcheck route test or service test.
- Docker build validation when reasonable.

## Autonomous Hardening Roadmap

### Phase A1: Auth Security And Route Protection

- Goal: make login/session/navigation credible enough for a standalone WMS MVP.
- Business reason: warehouse systems contain operational and inventory data; users must not see or execute unauthorized workflows.
- Technical tasks:
  - Add login attempt storage and rate-limit checks.
  - Rotate session token during organization switch.
  - Add route and navigation access mapping.
  - Make WMS navigation role-aware.
  - Add protected-route matrix tests.
- Files/modules: listed in module 1.
- Validation: `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Self-review: auth is Russian-friendly, sessions rotate, forbidden roles lose nav links, protected route tests exist.
- Continue when: validation passes and no unsafe public organization switching remains.

Status:
- Implemented in this pass.
- Added DB-backed login attempt tracking and rate-limit checks.
- Added session rotation on organization switch.
- Added role-aware WMS navigation and route matrix tests.
- Added middleware protected-route tests.
- Validation passed with `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: password reset/invite email, 2FA, long-term lockout administration, and broader route handler permission tests.

### Phase A2: Canonical Permission-Based RBAC

- Goal: enforce MVP-safe permissions independently of UI hiding.
- Business reason: a standalone WMS cannot allow warehouse workers or viewers to reach stock correction, settings, user management, or cross-organization data by direct URL/API calls.
- Technical tasks:
  - Replace draft `WMS_*` permissions with canonical permission names required for production RBAC.
  - Keep legacy aliases during migration so old checks do not silently become permissive.
  - Update service-layer permission checks to canonical permissions.
  - Add route-access matrix checks and Russian access-denied UI.
  - Add permission matrix tests and organization isolation guard tests.
- Files/modules:
  - `src/lib/permissionModel.ts`
  - `src/server/permissions.ts`
  - `src/server/routeAccess.ts`
  - `src/lib/wmsText.ts`
  - `src/components/AppShell.tsx`
  - `src/components/AccessDenied.tsx`
  - `src/components/RouteAccessBoundary.tsx`
  - WMS services under `src/server/services/**`
  - `src/server/permissions.test.ts`
  - `src/server/routeAccess.test.ts`
  - `src/server/storeAccess.test.ts`
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`.
- Self-review: workers can execute assigned operations but cannot mutate settings or perform corrections; viewers cannot mutate; service layer rejects unauthorized operations; Russian forbidden UI exists.
- Continue when: validation passes and docs record remaining route/e2e authorization gaps.

Status:
- Implemented in this pass.
- Canonical permissions are now the source of truth, with legacy aliases only for safe migration compatibility.
- Service checks now use operation-specific permissions such as `receiving.execute`, `putaway.execute`, `adjustments.create`, `cycleCounts.approve`, `picking.create`, and `packing.execute`.
- Added Russian forbidden state and client-side route boundary for direct unauthorized WMS page access.
- Validation passed with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: route handler tests for every API endpoint and browser E2E checks for role-specific navigation/action blocking.

### Phase B1: Barcode Registry Foundation

- Goal: support multiple product/location labels and conflict detection.
- Business reason: real warehouses scan supplier, internal, and location labels; one barcode column is not enough.
- Technical tasks: add barcode registry model, service, conflict checks, resolver integration, label export skeleton.
- Validation: Prisma generate/migrate, typecheck, lint, barcode tests, build.
- Continue when: duplicate and ambiguous barcodes are blocked per tenant.

Status:
- Implemented in this pass at foundation level.
- Added tenant-scoped `barcode_labels`, API, CSV export, resolver integration, and Russian `Штрихкоды` page.
- Added conflict checks against existing product, variant, location, order, work, and registry codes.
- Validation passed with `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: product import integration, printable label templates, route-level tests, edit/deactivate flow, and XLSX support.

### Phase B2: Product Import

- Goal: let managers create product catalogs without manual form entry.
- Business reason: onboarding stock requires import, not one-by-one CRUD.
- Technical tasks: CSV parser without adding heavy dependency unless needed, import route, preview/validation errors, Russian UI.
- Validation: product import tests and build.
- Continue when: row-level success/failure is tested.

Status:
- Implemented in this pass for CSV.
- Added parser/service/API/UI with row-level Russian validation, products, variants, and additional barcode-label aliases.
- Validation passed with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: XLSX support, dry-run preview, import route tests, update-existing mode, and richer conflict reporting.

### Phase C1: Receiving Operational Model

- Goal: receive against expected lines with controlled exceptions.
- Business reason: real deliveries are short, over, damaged, or include unknown items.
- Technical tasks: supplier/reference fields, receipt exception states, damaged receipt handling, unknown barcode exception, idempotent route tests.
- Validation: receiving service/route tests and build.
- Continue when: exact, under, over, damaged, unknown barcode, and double-submit scenarios are covered.

Status:
- Partially implemented in this pass.
- Added damaged quantity, short quantity, exception notes, short-close, and over-received statuses.
- Receive commands now accept good/damaged quantities; damaged quantity is received and immediately marked unavailable through stock state inside the same transaction.
- Validation passed with `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: supplier model, unknown-barcode exception record, label printing, route-level receiving tests, configurable over/under policy, and put-away generation from receiving lines.

### Phase D1: Put-Away Work Generation

- Goal: convert received stock into executable put-away work.
- Business reason: workers need tasks, not manual movement forms.
- Technical tasks: generate `PUTAWAY` work lines from received lines, suggested destination, partial completion.
- Validation: put-away tests and build.
- Continue when: receiving-to-putaway scenario works end to end.

Status:
- Partially implemented in this pass.
- Added receiving-line links on work lines, generated `PUTAWAY` work from received quantities, suggested destination lookup, partial line completion, and Russian task cards on `Размещение`.
- Validation passed with `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`.
- Remaining hardening: capacity checks, strict scan confirmation for generated work, route-level tests, destination override UI, and automatic generation after receiving close.

### Phase E1: Allocation/Reservation Engine

- Goal: reserve order demand before picking.
- Business reason: picking directly from on-hand can oversell or double-pick.
- Technical tasks: allocation model/service, split-bin allocation, reservation stock deltas, release on cancel.
- Validation: allocation tests and build.
- Continue when: reserved quantities prevent double allocation.

Status:
- Started in this pass.
- Added the additive `InventoryReservation` schema and reservation statuses as the first prerequisite.
- Remaining hardening: reservation service, stock-state reservedQty updates, idempotent reserve/release commands, split-bin allocation, release on cancel, allocation-driven pick work, and tests.

### Phase F1: Picking From Allocation

- Goal: pick multi-line/split-bin orders safely.
- Business reason: real orders often span bins and partial stock.
- Technical tasks: generate pick work from allocations, short-pick resolution state, scan retry UX, picked stock policy.
- Validation: picking tests and build.
- Continue when: split-bin pick and short-pick are tested.

### Phase G1: Packing Session Hardening

- Goal: verify picked items before shipping handoff.
- Business reason: picking is not the same as packed and ready to ship.
- Technical tasks: packing session model, verification lines, duplicate pack prevention, exception audit.
- Validation: packing tests and build.
- Continue when: pack/ready-to-ship scenario works.

### Phase H1: Cycle Count Recount And Exceptions

- Goal: make counts operationally safe.
- Business reason: counts must support blind counting, unexpected items, missing items, and manager review.
- Technical tasks: blind count flag, recount attempts, unexpected item lines, approval/rejection reasons.
- Validation: cycle count tests and build.
- Continue when: no stock changes before approval and recount history is preserved.

### Phase I1: Replenishment Work Hardening

- Goal: turn replenishment rules into an operational queue.
- Business reason: pick faces must be refilled before pickers fail.
- Technical tasks: manual/scheduled command, priority queue, shortage exception state, scan execution.
- Validation: replenishment tests and build.
- Continue when: low-stock generation and insufficient-source behavior are tested.

### Phase J1: Route And E2E Test Harness

- Goal: prove real workflows through API/UI boundaries.
- Business reason: WMS correctness cannot rely only on isolated unit tests.
- Technical tasks: route test utilities, cross-tenant tests, Playwright or documented browser harness, scanner flow happy/failure paths.
- Validation: typecheck, lint, unit tests, route tests, E2E if configured, build.
- Continue when: core flows are covered by success and failure tests.

### Phase K1: Production Readiness

- Goal: make the product deployable and operable.
- Business reason: a production WMS needs reliable deployment, backup, restore, health, logging, and migration processes.
- Technical tasks: Dockerfile, `.dockerignore`, healthcheck DB probe, logger, deployment/backup/security runbooks.
- Validation: docker build if available, build, health tests.
- Continue when: runbooks and health checks are concrete.

## Completion Gate

Do not call this WMS production-ready until all of these are true:

- Receiving supports expected vs actual, under/over/damaged/unknown scenarios.
- Put-away creates executable work and supports partial completion.
- Allocation/reservation exists and is used by picking.
- Picking supports multi-line and split-bin scenarios.
- Short-pick handling exists with review/resolution.
- Packing/shipping handoff exists with verification.
- Product import exists.
- Barcode label registry exists.
- Browser/mobile or equivalent scanner E2E tests exist.
- Protected route and permission matrix tests exist.
- Cross-tenant route tests exist.
- Production Dockerfile and deployment/backup runbooks exist.
- Docs clearly state what remains non-production.
