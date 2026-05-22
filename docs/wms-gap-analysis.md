# Standalone WMS Production Gap Analysis

## Current Verdict

The current application is an initial standalone WMS draft with several real foundations, not a business-ready production MVP yet.

It has useful models, service boundaries, Russian UI screens, critical stock-rule tests, a production-oriented email/password session path, simple work-template/location-rule configuration, and MVP replenishment. However, it is still shallow in places that matter for real warehouse work: replenishment has only basic min/max rules, the directive engine is intentionally MVP-level, packing/shipping handoff is missing, product import and label printing are missing, scanner workflows do not have true browser/e2e coverage, and several exception paths are only partially modeled.

This document is the hardening source of truth. Do not mark the WMS as complete until the remaining gaps are closed or explicitly documented as non-MVP/product-decision items.

## 1. What Currently Exists

### Data Models

Existing Prisma models:

- `User`
- `Store` as current tenant/company/store boundary
- `StoreUser`
- `Product`
- `ProductVariant`
- `CustomerOrder`
- `CustomerOrderLine`
- `AuditLog`
- `Warehouse`
- `WarehouseZone`
- `WarehouseLocation`
- `WarehouseWorkTemplate`
- `WarehouseLocationDirective`
- `ReplenishmentRule`
- `InventoryLocationBalance`
- `InventoryMovement`
- `ReceivingSession`
- `ReceivingLine`
- `WarehouseWork`
- `WarehouseWorkLine`
- `CycleCountSession`
- `CycleCountLine`

Existing enums:

- roles: `OWNER`, `ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_WORKER`, `VIEWER`, plus legacy compatibility roles `MANAGER`, `STAFF`, `CASHIER`
- warehouse/location status
- location type
- movement type
- adjustment reason
- receiving status
- work status
- cycle count status
- order status

Current stock state:

- `onHandQty`
- `reservedQty`
- `pickedQty`
- `damagedQty`
- `blockedQty`
- `availableQty` calculated in service
- `unavailableQty` calculated in service

### Services

Existing service modules:

- `WarehouseService`
- `LocationService`
- `ProductService`
- `StockMovementService`
- `ReceivingService`
- `PutawayService`
- `TransferService`
- `AdjustmentService`
- `CycleCountService`
- `PickingService`
- `BarcodeService`
- `WarehouseRuleService`
- `ReplenishmentService`
- `DashboardService`
- `SettingsService`
- `AuditService`

Strong foundation:

- stock mutation is centralized in `StockMovementService`;
- stock mutation and movement creation are transactional;
- movement route is read-only;
- a database trigger migration blocks update/delete on `inventory_movements`;
- tenant/store isolation is checked in service queries.

### API Routes

Existing route groups:

- `/api/health`
- `/api/settings/overview`
- `/api/warehouses`
- `/api/warehouse-zones`
- `/api/warehouse-locations`
- `/api/products`
- `/api/orders`
- `/api/inventory/balances`
- `/api/inventory/movements`
- `/api/receiving/sessions`
- `/api/put-away`
- `/api/transfers`
- `/api/adjustments`
- `/api/cycle-counts`
- `/api/warehouse-work`
- `/api/barcode/resolve`
- `/api/dashboard/wms`

Shallow parts:

- no user/admin CRUD API;
- company/tenant creation and session-backed switching exist for owner/admin users.

### UI Screens

Existing screens:

- `Обзор`
- `Склады и ячейки`
- `Остатки`
- `Приёмка`
- `Размещение`
- `Перемещения`
- `Сборка заказов`
- `Инвентаризация`
- `История движений`
- `Настройки`

Russian UX is present in navigation and most worker screens.

Shallow parts:

- settings are informative, not fully operational;
- scanner flows are forms with scan fields, but not validated in a real browser test;
- worker flows need more guardrails for partial/exception paths.

### Tests

Existing tests cover:

- stock movement rules;
- negative stock prevention;
- stock mutation boundaries;
- a Postgres-backed receive → put-away → transfer → adjustment → cycle count → pick smoke workflow;
- permissions;
- auth fallback policy;
- barcode selection and normalization;
- receiving rules;
- adjustment rules;
- cycle-count rules;
- picking rules;
- static scanner-flow contracts.

Shallow parts:

- no route handler tests;
- no browser/mobile/scanner tests;
- no true cross-tenant integration tests against Postgres;
- no audit-log assertions for every business event.

### Documentation

Existing docs:

- `docs/wms-production-blueprint.md`
- `docs/wms-mvp-implementation.md`
- this gap analysis

Shallow parts:

- no operator manual;
- no deployment runbook beyond basics;
- no backup/restore test procedure;
- no incident/stock correction policy.

### Russian UX Coverage

Good coverage:

- main navigation;
- worker workflow labels;
- common WMS statuses;
- common errors;
- empty states;
- dashboard/settings copy.

Gaps:

- some internal enum-like statuses can still leak in edge cases;
- API error mapping is message-string based;
- validation errors are not structured with stable error codes;
- audit log events are technical English strings.

## 2. What Is Still Shallow Or Scaffold-Like

### Warehouses

Exists:

- create/update/deactivate APIs and UI;
- tenant-scoped uniqueness;
- active/inactive state;
- audit log writes.

Gaps:

- no capacity/metadata;
- no warehouse-level default receiving/picking policies;
- warehouse deactivation is guarded, but deactivation UX still needs clearer recovery steps.

### Zones

Exists:

- additive zone model and CRUD through location screen.

Gaps:

- no zone type/purpose;
- zone deactivation is guarded while active locations exist;
- no user-friendly zone management screen separate from locations.

### Locations

Exists:

- code/barcode/type/status/flags;
- tenant-scoped barcode uniqueness;
- scanner lookup.

Gaps:

- no label printing/export;
- no location capacity;
- location deactivation is guarded while stock or open work exists;
- no structured barcode registry.

### Products

Exists:

- product and variant models;
- seeded demo product;
- list API for workflows.

Gaps:

- no import flow;
- no label/printing workflow;
- product deactivation is guarded while stock or open work exists.

### Barcodes

Exists:

- direct scan resolution from location code/barcode, product SKU/barcode, variant SKU/barcode, order number, and work.
- scan normalization for whitespace/control characters.

Gaps:

- no barcode label registry;
- no label printing;
- no alias/multiple barcodes per item;
- no scan history or ambiguity resolver UI.

### Stock Balances

Exists:

- location-level balances;
- physical and unavailable stock states;
- available quantity calculation.

Gaps:

- reserved/picked stock states still need fuller operational flows;
- no reconciliation report comparing ledger to balances;
- `onHandQty` is intentionally not constrained while explicit admin negative correction remains allowed.

### Movement Ledger

Exists:

- append-only API design;
- database trigger blocks update/delete;
- movement history UI.

Gaps:

- no signed before/after snapshot per movement;
- idempotency exists for movement-only commands, not whole-command receiving/picking;
- ledger-to-balance reconciliation UI/API exists, but no scheduled job/alert yet;
- no user-friendly audit drilldown.

### Receiving

Exists:

- session/line model;
- receive into receiving location;
- RECEIVE movement through stock service;
- completion rules.

Gaps:

- receiving depends on existing products;
- no supplier/purchase reference model;
- no duplicate scan/idempotency protection;
- no over/under receipt exception workflow beyond quantity validation;
- no receiving labels.

### Put-Away

Exists:

- move from receiving to storage/picking;
- PUTAWAY movement through stock service.

Gaps:

- no generated put-away work lines;
- no location suggestions;
- no destination capacity;
- no partial put-away task history beyond movements.

### Transfers

Exists:

- source/product/destination/quantity flow;
- stock service movement.

Gaps:

- no transfer session/header;
- no multi-line transfers;
- no transfer reason;
- no pending/in-progress transfer state.

### Adjustments

Exists:

- adjustment reasons;
- manual correction note required;
- admin-only explicit negative correction path.

Gaps:

- no approval workflow for high-risk corrections;
- no attachment/evidence;
- no reason configuration.

### Cycle Counts

Exists:

- session and line models;
- expected snapshot;
- counted quantity;
- submit and approve;
- approval creates stock movement.

Gaps:

- no blind count option;
- no count assignment;
- no recount history;
- no count for missing/unexpected item not already in balance snapshot.

### Picking

Exists:

- work header and work lines;
- create pick work from existing order;
- scan location/product and confirm quantity;
- partial pick review marker.

Gaps:

- no reservation/allocation;
- order creation is single-line MVP only;
- no line splitting across bins;
- no short-pick resolution workflow;
- no pack/ship handoff;
- picked quantity semantics need future packing/shipping policy.

### Dashboard

Exists:

- operational metrics and panels.

Gaps:

- no stale work alerts;
- no stock accuracy trend;
- no role-specific dashboard;
- no drilldown from every card.

### Settings

Exists:

- active organization/current user/permission/setup overview.
- admin-only user list, add user, role change, and remove access.
- simple work-template and location-rule forms for owner/admin warehouse setup.

Gaps:

- no self-service signup/invite flow;
- no barcode label settings.
- warehouse rules are MVP-level forms, not a full directive sequencing engine.

### Permissions

Exists:

- role-to-WMS-permission map;
- server-side checks.

Gaps:

- no customizable roles;
- role assignment UI exists, but role-aware navigation is still missing;
- no route-level permission test matrix;
- no staff-safe filtering of navigation.

### Auth, Users, Roles

Exists:

- email and password login;
- password hashes using Node `scrypt` with per-password salts;
- HTTP-only session cookie with server-side session records;
- protected `/wms` routes and non-auth API routes;
- organization/company context stored in the session;
- logout;
- seed admin login instructions;
- guarded development fallback for explicit header/cookie context when `ALLOW_DEV_AUTH_FALLBACK=true`.

Gaps:

- no invite or password reset flow;
- no rate limiting or account lockout;
- no SSO/2FA;
- no session rotation on organization switch;
- no browser route matrix proving every API rejects unauthenticated requests.

### Tenant/Company Isolation

Exists:

- `storeId` scope on most models;
- access checks through request context and service queries.
- current user can create and switch accessible organizations through a server-side session.

Gaps:

- no formal organization UI naming in schema;
- no row-level database security;
- no exhaustive route-level cross-tenant tests;
- some child models rely on parent relation rather than direct `storeId`.

### Error Handling

Exists:

- `AppError`;
- Russian public message map.

Gaps:

- errors use English message keys;
- no stable error codes;
- no field-level validation response;
- no structured client error display.

### Validation

Exists:

- custom route parsing helpers;
- service assertions.

Gaps:

- no schema validation library;
- many forms only rely on basic required inputs;
- no SKU/barcode formatting rules;
- no idempotency validation.

### Audit Trail

Exists:

- audit log writes for many mutations.

Gaps:

- audit actions are technical strings;
- no before/after snapshots for high-risk changes;
- not every route has test-backed audit assertions.

### Mobile/Scanner UX

Exists:

- scanner components;
- focused scan input;
- Russian prompts.
- accessible live notices;
- mobile numeric quantity entry;
- keyboard-scanner-friendly scan field attributes.

Gaps:

- no real mobile viewport visual tests;
- no hardware scanner simulation beyond Enter-compatible forms;
- some flows still expose dense tables on worker pages;
- no sound/haptic feedback.

### Production Deployment Readiness

Exists:

- Docker Postgres for local dev;
- `/api/health`;
- build passes.

Gaps:

- no production Dockerfile;
- no backup/restore runbook validation;
- no monitoring integration;
- auth exists, but rate limiting, password reset, and account recovery are missing;
- no dependency upgrade/security pass;
- no migration deployment pipeline.

## 3. Real WMS Business Scenario Check

| Scenario | Current state | Gap |
| --- | --- | --- |
| Create company/tenant | Owner/admin can create and switch organizations through session-backed settings | Self-service signup remains missing |
| Create warehouse | Works | Need deactivation safety checks |
| Create zones and locations | Works | Need better zone UX and deactivate safeguards |
| Configure work/routing rules | Simple work templates and location directives work from settings | Directed put-away suggestions still missing |
| Create/import products | Manual create/update/deactivate now works | Bulk import still missing |
| Assign product barcodes | Product and variant barcode CRUD works | Label printing and barcode registry still missing |
| Receive goods into receiving area | Works with whole-command idempotency | Purchase-order import remains out of MVP |
| Put away into storage location | Works | Needs task/history polish |
| View stock by warehouse/location/product | Works | Needs filters and reconciliation |
| Transfer stock between locations | Works | Needs reason/header for operational trace |
| Replenish pick location | Basic min/max rule, generated work, and scanner confirmation work | No scheduled generation or priority queue |
| Block damaged stock | Works through state-specific adjustment | Release/approval workflow still missing |
| Adjust stock with reason and permission | Works for on-hand, damaged, and blocked states | High-risk approval workflow still missing |
| Perform cycle count | Works for existing balances | Needs unexpected item and recount/reject |
| Approve/reject count difference | Approve and reject/recount work | No multi-stage recount history |
| Create order/pick task | Simple order creation and pick task creation work | Multi-line order editing still missing |
| Pick correct item/location | Works | Needs browser/e2e coverage |
| Prevent picking more than available | Works through stock service and DB smoke | Needs browser/e2e coverage |
| Handle partial pick | Marker exists and pick confirmation is idempotent | Needs resolution workflow |
| Pack picked order | Basic packing work, product verification, and shipping handoff work | No cartons, labels, or carrier integration |
| Keep movement history append-only | App + DB trigger | Needs migration smoke and reconciliation |
| Enforce user permissions | Server permissions and role assignment UI work | Needs route/browser permission matrix and role-aware nav |
| Prevent cross-company access | Service-scoped and DB-smoke-tested across product, location, stock, and pick-work services | Route/browser matrix still missing |
| Russian-friendly errors | Mostly | Needs error codes/coverage |
| Mobile/scanner workflow | Basic | Needs real viewport/browser validation |

## 4. Missing Production Requirements

Auth:

- invite flow, password reset, SSO/2FA;
- rate limiting and account lockout;
- route/browser unauthenticated-access matrix.

Tenant isolation:

- cross-tenant integration tests;
- broader route-level tenant tests;
- possible future DB row-level security.

Roles/permissions:

- basic user role management UI exists;
- role-aware nav;
- permission matrix tests.

Stock transaction safety:

- stronger DB constraints on balance fields;
- idempotency keys for stock commands;
- ledger-to-balance reconciliation exists as a manual report; scheduled checks are still missing.

Negative stock prevention:

- app rules exist;
- DB-level checks and integration tests still needed.

Database constraints:

- append-only trigger exists;
- non-negative constraints exist for reserved/picked/damaged/blocked stock buckets;
- lifecycle/deactivation checks exist for warehouses, zones, locations, products, and variants; UI recovery guidance remains shallow.

Idempotency:

- implemented for movement-only put-away, transfer, and adjustment commands;
- implemented as whole-command protection for receiving and picking, including workflow line state;
- still missing for replenishment confirmation and future packing/shipping actions.

Audit logs:

- write path exists;
- read UI and Russian business labels exist;
- before/after snapshots and full route-backed audit assertions are still incomplete.

Validation:

- no schema validator;
- no structured field errors;
- no import validation.

Loading/empty/error states:

- basic states exist;
- need route-specific recovery actions and worker-safe errors.

Responsive/mobile scanner UI:

- basic responsive layout exists;
- no visual/e2e verification.

Work templates/location directives:

- simple templates and rules exist for default receiving location, preferred put-away zone, pick location, damaged location, and replenishment zones;
- receiving can use the configured default receiving location;
- pick work source selection honors configured pick-location priority;
- still missing directed put-away suggestions in the worker UI and a full rule engine.

Replenishment:

- min/max rules exist for product stock in pick locations;
- replenishment work can be generated from a source location or source zone;
- scanner confirmation moves stock with a transactional `TRANSFER` movement through `StockMovementService`;
- still missing scheduled generation, priority queues, source optimization, and exception-driven replenishment.

Packing/shipping foundation:

- picked orders can create packing work;
- packing verifies product and quantity without changing stock;
- packed orders can be marked `Передан в отгрузку`;
- still missing carton contents, shipping labels, carrier integration, and packing idempotency.

Russian copy consistency:

- strong baseline;
- technical audit/event/status strings still need cleanup.

Data seeding/demo data:

- minimal seed exists;
- needs realistic end-to-end demo data and reset instructions.

End-to-end tests:

- DB-backed service workflow smoke exists;
- route/browser workflow tests are still missing.

Deployment config:

- local Docker DB exists;
- app production Docker/deploy config missing.

Backup/restore:

- documented as a need;
- not tested.

Observability/logging:

- console error only;
- no structured logs, metrics, or alerting.

## 5. Prioritized Hardening Roadmap

The phases below are intentionally small. Split any phase further if implementation risk increases.

### Phase 1: Product And Barcode CRUD

- Goal: make receiving/picking possible without seed-only products.
- Business reason: warehouse users cannot receive real goods if products and barcodes cannot be created.
- Technical tasks: add product/variant create/update/deactivate services, API routes, Russian product page, barcode duplicate handling, audit logs.
- Files/modules: `productService`, `/api/products`, `/api/products/[id]`, `/wms/products`, nav text, tests.
- Validation: prisma generate if needed, typecheck, lint, tests, build.
- Self-review: tenant-scoped, permission-gated, Russian UI, no duplicate barcode ambiguity.
- Continue when: user can create product and barcode from UI.

### Phase 2: Order Creation For Picking

- Goal: remove seed dependency from picking.
- Business reason: picking is not useful unless users can create a simple order/task source.
- Technical tasks: add simple order create API/UI in picking flow, product line selection, quantity validation.
- Files/modules: `orderService`, `/api/orders`, `/wms/picking`.
- Validation: typecheck, lint, tests, build.
- Self-review: order is tenant-scoped, product belongs to tenant, quantities positive.
- Continue when: user can create order and then pick it.

### Phase 3: Cycle Count Reject/Recount

- Goal: support approve/reject difference workflow.
- Business reason: managers must be able to reject bad counts without changing stock.
- Technical tasks: add reject/reopen route, service method, UI action, audit log, tests.
- Files/modules: `cycleCountService`, `/api/cycle-counts/[id]/reject`, `/wms/cycle-counts`.
- Validation: typecheck, lint, tests, build.
- Self-review: reject does not mutate stock and only works before approval.
- Continue when: pending count can return to counting.

### Phase 4: State-Specific Adjustments

- Goal: support damaged/blocked stock as real stock states.
- Business reason: damaged stock should be unavailable without disappearing from physical count.
- Technical tasks: add adjustment target state, update stock engine/service, UI reason mapping, tests.
- Files/modules: adjustment service/rules/UI, stock engine.
- Validation: typecheck, lint, tests, build.
- Self-review: damaged/blocked stock remains physical but unavailable.
- Continue when: user can block damaged stock safely.

### Phase 5: DB Non-Negative Balance Constraints

- Goal: protect stock state at database level.
- Business reason: application bugs should not create impossible balances.
- Technical tasks: additive check constraints for non-negative stock fields and availability where possible.
- Files/modules: migration, stock tests/docs.
- Validation: prisma generate, migration smoke if DB available, typecheck, tests, build.
- Self-review: no destructive migration, admin negative correction behavior reviewed.
- Continue when: constraints match app rules.

### Phase 6: Database-Backed Workflow Integration Tests

- Goal: prove real receive → put-away → transfer → count → pick flow.
- Business reason: isolated rule tests do not prove workflow correctness.
- Technical tasks: add test DB setup or transactional integration tests using Prisma.
- Files/modules: test helpers, service integration tests.
- Validation: tests with local DB, typecheck, lint, build.
- Self-review: tests isolate tenant data and prove balances/movements.
- Continue when: critical workflow passes against Postgres.

### Phase 7: Cross-Tenant Route/Service Tests

- Goal: prove company isolation.
- Business reason: multi-tenant data leakage is production-critical.
- Technical tasks: create two tenants in tests and verify reads/mutations are blocked.
- Files/modules: service tests, maybe route tests.
- Validation: tests, typecheck, lint, build.
- Self-review: no API returns other tenant data.
- Continue when: cross-tenant tests cover products, locations, stock, work.

### Phase 8: Audit Log Read UI

- Goal: make audit trail usable.
- Business reason: managers need to understand who changed stock/configuration.
- Technical tasks: audit list API/UI, Russian business labels, filters.
- Files/modules: audit service/API/page/settings link.
- Validation: typecheck, lint, tests, build.
- Self-review: audit is tenant-scoped and readable.
- Continue when: user can inspect audit events.

### Phase 9: Worker Flow Mobile QA

- Goal: verify scanner flows on mobile layouts.
- Business reason: warehouse workers often use handheld/mobile devices.
- Technical tasks: add browser testing stack if approved/available, or scripted visual smoke with existing tooling.
- Files/modules: test config, scanner flow tests.
- Validation: e2e/visual tests, typecheck, lint, build.
- Self-review: no overlapping controls, scan input focus works.
- Continue when: mobile scanner path is verified.

### Phase 10: Production Auth And Session Default

- Goal: replace demo/local auth with a production-oriented default.
- Business reason: production WMS cannot rely on headers/fallback context.
- Technical tasks: email/password login, secure password hashing, server-side sessions, HTTP-only cookies, logout, route/API protection, role mapping, seed admin instructions.
- Files/modules: auth, middleware, user services/UI.
- Validation: prisma generate, migrate, seed, typecheck, lint, auth tests, DB smoke, build.
- Self-review: no normal production route can be used without a session.
- Continue when: login/logout works and dev fallback is explicit.

### Phase 11: Company/Tenant Admin Flow

- Goal: allow creating and switching organizations safely.
- Business reason: standalone product needs tenant lifecycle management.
- Technical tasks: company create/update/switcher, current user membership, admin-only controls.
- Files/modules: store/organization service/API/UI.
- Validation: typecheck, lint, tests, build.
- Self-review: no accidental cross-tenant access.
- Continue when: admin can manage organization context.

### Phase 12: Idempotency For Stock Commands

- Goal: prevent duplicate scanner submissions.
- Business reason: warehouse scanners can submit twice.
- Technical tasks: command idempotency key model, service checks, UI request keys.
- Files/modules: schema, stock service, receiving/picking/transfer routes.
- Validation: prisma generate, tests, build.
- Self-review: duplicate commands do not duplicate stock movement.
- Continue when: receive/pick/transfer duplicate tests pass.

### Phase 13: Reconciliation Report

- Goal: prove balances match movement ledger.
- Business reason: stock accuracy requires auditability.
- Technical tasks: report service compares summed movements to balances, UI panel.
- Files/modules: dashboard/report service/UI/tests.
- Validation: typecheck, lint, tests, build.
- Self-review: discrepancies are clear and tenant-scoped.
- Continue when: dashboard can flag ledger/balance mismatch.

### Phase 14: Import Products

- Goal: practical bulk setup.
- Business reason: real warehouses do not create every SKU manually.
- Technical tasks: CSV import preview/validate/apply, duplicate handling.
- Files/modules: product import service/API/UI.
- Validation: tests, typecheck, lint, build.
- Self-review: no partial bad imports without user confirmation.
- Continue when: CSV import works safely.

### Phase 15: Deployment Runbook And Backup Smoke

- Goal: make deployment operationally credible.
- Business reason: production WMS needs recoverability.
- Technical tasks: Dockerfile/deploy notes, backup/restore commands, health/dependency checklist.
- Files/modules: docs/config.
- Validation: build, health check, docs review.
- Self-review: operator can deploy and recover a local DB.
- Continue when: runbook is actionable.

## Phase Progress

#### Phase 1: Product And Barcode CRUD

- Status: hardened, but bulk import remains future work.
- What changed: added product/variant create, update, deactivate APIs; added Russian `Товары` page; added scanner-safe SKU/barcode uniqueness checks across products and variants; added product rule tests and audit writes.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passed.
- UX review: product setup is now Russian-first and usable from the WMS nav.
- Architecture review: product mutations are tenant-scoped, permission-gated with `WMS_MANAGE_PRODUCTS`, and do not mutate stock.
- Remaining risk: product import is still missing; product deactivation does not yet check active balances or open work.

#### Phase 2: Order Creation For Picking

- Status: hardened for single-line MVP orders.
- What changed: added simple customer order creation API and Russian order form inside `Сборка заказов`; added order number/quantity validation and audit writes.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passed.
- UX review: workers/managers can create a basic order in the picking screen without relying on seed data.
- Architecture review: order creation is tenant-scoped, permission-gated with `WMS_PICK`, validates product/variant ownership, and does not mutate stock.
- Remaining risk: only one line can be created at a time; no full order editing/cancel UI; no reservation/allocation yet.

#### Phase 3: Cycle Count Reject/Recount

- Status: hardened for MVP approval/rejection.
- What changed: added reject/recount rule, service method, API route, UI action, audit write, and tests.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passed.
- UX review: managers can now return a pending count to counting with Russian confirmation copy instead of being forced to approve.
- Architecture review: rejection is permission-gated with `WMS_APPROVE_CYCLE_COUNT`, tenant-scoped, and does not create stock movements.
- Remaining risk: no full recount history or reject reason field yet.

#### Phase 4: State-Specific Adjustments

- Status: hardened for damaged/blocked MVP use.
- What changed: adjustment flow can now change factual on-hand stock, damaged unavailable stock, or blocked unavailable stock; stock state changes still route through `StockMovementService`.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passed.
- UX review: the adjustment screen now asks `Что изменить` in Russian and distinguishes factual stock from damaged/blocked stock.
- Architecture review: damaged/blocked adjustments are transactional, tenant-scoped, permission-gated, ledger-backed, and do not bypass the central stock service.
- Remaining risk: no manager approval flow for high-risk corrections; damaged/blocked release is represented as a negative state adjustment, which is safe but not yet a dedicated workflow.

#### Phase 5: DB Non-Negative Balance Constraints

- Status: partially hardened.
- What changed: added database check constraints for `reservedQty`, `pickedQty`, `damagedQty`, and `blockedQty` so unavailable stock buckets cannot go negative.
- Validation: `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passed.
- UX review: no UI change.
- Architecture review: constraints are additive and do not conflict with the explicit admin negative on-hand correction policy.
- Remaining risk: `onHandQty` is intentionally not constrained because the current business rule allows explicit admin negative correction; a future product decision should decide whether that policy remains acceptable.

#### Phase 6: Database-Backed Workflow Integration Tests

- Status: hardened for the critical MVP service workflow.
- What changed: added `pnpm test:db` and `scripts/wms-workflow-smoke.ts`, which creates an isolated tenant and validates receive, put-away, transfer, damaged-stock adjustment, cycle-count correction, order creation, pick work creation, picking, balance state, available quantity, and movement ledger sequence against Postgres.
- Validation: `pnpm prisma:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed. `pnpm test:db` needs local Docker/Postgres and, in the Codex sandbox, elevated execution because `tsx` creates a local IPC pipe and Prisma connects to Docker.
- UX review: no UI change.
- Architecture review: the smoke proves all stock-changing workflow steps use service-layer transactions and append movements while preserving tenant isolation for the generated tenant.
- Remaining risk: this is a service-level smoke, not browser/route/e2e coverage; expanded cross-tenant and UI scanner tests are still needed.

#### Phase 7: Cross-Tenant Service Smoke

- Status: partially hardened.
- What changed: extended the DB workflow smoke to create a second tenant and assert that cross-tenant product updates, product reads, location creation, stock movement, and pick-work creation are blocked.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: no UI change.
- Architecture review: service-level tenant isolation now has a real Postgres smoke covering configuration, product, stock, and work boundaries.
- Remaining risk: route-handler and browser-level cross-tenant tests are still missing; child-table isolation should continue to be expanded as new flows are added.

#### Phase 8: Audit Log Read UI

- Status: hardened for MVP visibility.
- What changed: added `WMS_VIEW_AUDIT`, audit-log list service, `/api/audit-logs`, Russian `Журнал действий` page, Russian action/entity labels, and DB smoke assertions that audit rows are tenant-scoped.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: managers/admins can now inspect key stock/configuration events in Russian without reading raw action names.
- Architecture review: audit reads are permission-gated and tenant-scoped; audit writes remain transactional where they are part of stock/configuration mutations.
- Remaining risk: audit metadata still lacks normalized before/after summaries for every high-risk event, and there are no route-handler tests for audit access yet.

#### Phase 9: Mobile Scanner Component Hardening

- Status: partially hardened.
- What changed: improved reusable scanner inputs with explicit labels, screen-reader scan instructions, autocorrect disabled, Enter-key hints, accessible live notices, mobile numeric quantity entry, and more stable worker task cards; expanded scanner contract tests.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: worker flows remain Russian-first and are more keyboard-scanner/mobile friendly without changing the underlying workflows.
- Architecture review: no stock behavior changed; DB workflow smoke still passes.
- Remaining risk: this is still static/component-level coverage. Real browser/mobile viewport testing remains missing because no e2e/browser test stack is installed in this repo yet.

#### Phase 10: Deactivation Safety Guards

- Status: hardened for core setup entities.
- What changed: warehouse deactivation now blocks active locations, stock, receiving sessions, work, and open cycle counts; zone deactivation blocks active locations; location deactivation blocks stock, receiving, work, and open counts; product and variant deactivation block active stock, receiving lines, work lines, count lines, and open orders.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: API errors are mapped to Russian messages that explain why an entity cannot be made unavailable.
- Architecture review: safeguards are service-layer checks inside the same mutation transactions before status/active changes; stock rules remain centralized.
- Remaining risk: UI currently shows the error but does not yet guide the user to close specific blocking work/stock rows.

#### Phase 11: Local User Administration

- Status: hardened for local standalone administration.
- What changed: added `WMS_MANAGE_USERS`, admin-only user membership service, `/api/users`, `/api/users/[id]`, Russian user management inside settings, audit labels for user actions, and DB smoke coverage for add/update/remove plus manager denial.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: admins can add users, change roles, and remove access from the Russian settings screen; last admin removal is blocked with a Russian error.
- Architecture review: user management is tenant-scoped, permission-gated, and audit-logged. It does not add a fake production auth provider.
- Remaining risk: authentication is still local/demo-header based; production login/session provider remains a product/ops decision.

#### Phase 12: Local Organization Context

- Status: hardened for local standalone tenant operations.
- What changed: request context now supports secure local cookies in addition to explicit headers; added organization list/create services, `/api/organizations`, `/api/context`, Russian organization create/switch UI in settings, audit labels, and DB smoke assertions for organization creation.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: admins can create another organization and switch the current organization from the Russian settings screen without editing request headers.
- Architecture review: organization creation is permission-gated, tenant membership is checked before switching, and the local context remains explicit. This is not presented as production authentication.
- Remaining risk: production-grade signup/login/session management is still missing and requires a product/security decision.

#### Phase 13: Stock Command Idempotency Foundation

- Status: partially hardened.
- What changed: added additive `stock_commands` table, central `StockMovementService` idempotency support with fingerprints, optional `idempotencyKey` support for put-away, transfer, and adjustment APIs, UI-generated idempotency keys for those workflows, and DB smoke assertions that duplicate transfers do not duplicate stock movements while key reuse with different payload is rejected.
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: duplicate scanner submission protection is invisible when it works; conflicting resubmissions get Russian recovery text.
- Architecture review: the new table is additive, stock mutation remains centralized, movement history remains append-only, and idempotency checks run inside stock transactions.
- Remaining risk: receiving and picking still need whole-command idempotency because they update receiving/work line state in addition to stock movement; adding only movement idempotency there would be misleading and potentially unsafe for partial operations.

#### Phase 14: Ledger-To-Balance Reconciliation

- Status: hardened for manual verification.
- What changed: added additive movement delta columns, populated signed stock-state deltas from `StockMovementService`, added reconciliation service/API/page, navigation entry `Проверка остатков`, and DB smoke assertions that the full workflow reconciles without discrepancies.
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: managers can manually check whether balances match movement history from a Russian page with clear discrepancy rows.
- Architecture review: reconciliation is based on ledger deltas written transactionally with the movement row; no stock mutation bypasses were introduced.
- Remaining risk: historical movements created before delta columns cannot be fully reconciled without a backfill policy; there is no scheduled reconciliation job or alerting yet.

#### Phase 15: Reference Alignment

- Status: documented as the production benchmark.
- What changed: added `docs/wms-reference-alignment.md` comparing the standalone WMS against Dynamics 365 Warehouse Management, Oracle WMS Cloud, NetSuite WMS, Odoo Inventory/Barcode, and SAP EWM-style concepts.
- Validation: documentation-only phase; implementation validation is covered by the following auth phase.
- UX review: reference gaps are translated into simple Russian worker/admin concepts instead of exposing enterprise terminology.
- Architecture review: the next roadmap focuses on work templates/location directives, replenishment, idempotency, packing/shipping foundation, product import, label registry, production readiness, and UX hardening.
- Remaining risk: reference alignment is a design benchmark, not proof that the missing concepts are implemented.

#### Phase 16: Email/Password Auth And Sessions

- Status: hardened for a standalone MVP default, not complete for public SaaS security.
- What changed: added `User.passwordHash`, `UserSession`, email/password login, salted `scrypt` password hashing, secure HTTP-only session cookies, logout, protected WMS/API middleware, session-backed organization context switching, Russian login/access errors, seed admin password instructions, and new production roles (`OWNER`, `WAREHOUSE_MANAGER`, `WAREHOUSE_WORKER`, `VIEWER`).
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm prisma:seed`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: login and settings are Russian-first; normal users see simple roles like `Владелец`, `Руководитель склада`, `Сотрудник склада`, and `Наблюдатель`.
- Architecture review: route/API access now requires a server-side session unless explicit dev fallback is enabled; tenant context is loaded from the session and membership; permissions remain server-side.
- Remaining risk: no password reset, invite email, rate limiting, account lockout, 2FA, or browser-level route protection matrix yet.

#### Phase 17: Simple Work Templates And Location Directives

- Status: implemented at MVP level.
- What changed: added `WarehouseWorkTemplate` and `WarehouseLocationDirective` tables, service/API, Russian settings UI, seed defaults, audit labels, DB smoke coverage, default receiving location lookup, and pick-location priority for pick work creation.
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate` applied the additive migration and then prompted for an extra dev migration; the prompt was killed and `pnpm exec prisma migrate status` confirmed the database is up to date. `pnpm prisma:seed`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: admins configure rules with Russian labels like `Ячейка приёмки по умолчанию` and `Приоритетная ячейка сборки`; worker screens remain simple and do not expose enterprise rule terminology.
- Architecture review: directives are tenant-scoped, permission-gated, additive, and audited; receiving and picking consult rules without bypassing stock services or changing stock directly.
- Remaining risk: this is not a full location-directive engine; put-away suggestions, replenishment generation, and rule conflict diagnostics remain future hardening.

#### Phase 18: MVP Replenishment

- Status: implemented at MVP level.
- What changed: added `ReplenishmentRule`, `REPLENISHMENT` work type, `completedQuantity` on work lines, `/api/replenishment`, Russian `Пополнение` page, min/max rule creation, generated replenishment work, scanner confirmation, and DB smoke coverage.
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate` applied the additive migration and then prompted for an extra dev migration; the prompt was killed and `pnpm exec prisma migrate status` confirmed the database is up to date. `pnpm prisma:seed`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: the UI is Russian-first and asks for warehouse, product, pick location, source, min/max, then scan source, destination, product, and quantity.
- Architecture review: stock changes are still transactional and use `StockMovementService` with a `TRANSFER` movement; replenishment rules/work are tenant-scoped and permission-gated.
- Remaining risk: no scheduled generation, priority queue, source optimization, route/browser tests, or replenishment exception workflow yet.

#### Phase 19: Whole-Command Idempotency For Receiving And Picking

- Status: hardened for the two highest-risk scanner submit flows.
- What changed: added workflow idempotency helper using `stock_commands`, added idempotency keys to receiving and picking services/routes/UI, and expanded DB smoke to prove duplicate receive/pick submissions do not duplicate movement or workflow-line updates while conflicting key reuse is rejected.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: duplicate-submit protection is invisible when it works; scanner pages still show simple Russian success/error messages.
- Architecture review: idempotency is claimed inside the same database transaction before workflow state changes; stock still changes only through `StockMovementService`.
- Remaining risk: replenishment confirmation and future packing/shipping commands still need the same whole-command protection.

#### Phase 20: Packing And Shipping Handoff Foundation

- Status: implemented at MVP foundation level.
- What changed: added `PACK` work type, `PACKING`, `PACKED`, and `READY_TO_SHIP` order statuses, packing service/API, Russian `Упаковка` page, product/quantity verification, ready-to-ship handoff, audit labels, and DB smoke coverage.
- Validation: `pnpm prisma:generate`, `pnpm prisma:migrate` applied the additive enum migration and then prompted for an extra dev migration; the prompt was killed and `pnpm exec prisma migrate status` confirmed the database is up to date. `pnpm prisma:seed`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: packing asks workers to verify products and quantities in Russian and exposes a simple `Передать в отгрузку` action.
- Architecture review: packing does not mutate stock; it creates warehouse work and changes order/work statuses transactionally with audit logs.
- Remaining risk: no carton records, package contents, shipping labels, carrier integration, packing idempotency, or browser/e2e tests yet.

#### Phase 21: Auth Security And Route Protection

- Status: hardened, but still not a full SaaS identity system.
- What changed: added additive `login_attempts` table, login rate-limit service, Russian login failure copy, persisted login attempt audit data, session-token rotation on organization switch, role-aware WMS navigation, route access matrix, middleware protection tests, and navigation visibility tests.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed. `pnpm prisma:migrate` is still not usable non-interactively; `migrate deploy` is the validated non-interactive path.
- UX review: login and access failures remain Russian-first; users no longer see navigation links for WMS areas their role cannot use.
- Architecture review: rate limiting is DB-backed, session switching invalidates the old session token and sets a new HTTP-only cookie, and route protection is covered by tests.
- Remaining risk: no password reset email, invite email delivery, 2FA, password history, long-term account lockout administration, or external identity provider.

#### Phase 22: Barcode Label Registry Foundation

- Status: implemented at foundation level, not yet a complete import/printing subsystem.
- What changed: added `BarcodeLabelEntityType`, `barcode_labels` table, barcode label service/API, CSV export, resolver integration, Russian `Штрихкоды` page, role-aware navigation entry, barcode audit label, and unit coverage for label code normalization/type validation/export.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed. An earlier parallel `pnpm typecheck` failed while `next build` was regenerating `.next/types`; rerunning typecheck after build completed passed.
- UX review: managers get a Russian page to register product, variant, and location codes and download a CSV label list. Worker scanner flows continue to resolve scans without exposing technical registry details.
- Architecture review: label codes are tenant-scoped and unique per organization, conflicts with existing product/location/order/work scan identifiers are blocked, and scan resolution deduplicates registry aliases against native SKU/barcode matches.
- Remaining risk: no bulk import, no label print templates, no deactivate/edit UI, no route-level barcode registry tests, and no XLSX support.

#### Phase 23: CSV Product Import Foundation

- Status: implemented for CSV, not yet XLSX or full preview/commit workflow.
- What changed: added product import parser/service, `/api/products/import`, Russian CSV upload panel on `Товары`, row-level validation errors, support for products, variants, primary barcodes, and additional barcode labels, plus parser unit tests.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: admins can import a CSV from the Russian Products page and get row-specific Russian errors instead of a generic failure.
- Architecture review: product import is permission-gated, tenant-scoped, transactional, and creates barcode-label aliases through the registry table. It does not mutate stock.
- Remaining risk: no XLSX parser, no dry-run preview screen, no update-existing mode, no route/database import tests, and DB uniqueness conflicts still need better row-level reporting.

#### Phase 24: Receiving Exceptions Foundation

- Status: partially hardened for real receiving discrepancies.
- What changed: added receiving line statuses for `CLOSED_SHORT` and `OVER_RECEIVED`, fields for damaged/short quantities and exception notes, non-negative DB checks, receive API support for good/damaged quantities, controlled over-receipt, short-close notes, Russian UI controls, and receiving rule tests.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: receiving remains one screen in Russian, with simple fields for normal quantity, damaged quantity, over-receipt permission, and short-close reason.
- Architecture review: good and damaged receipts still use `StockMovementService`; damaged receipt creates a receive movement and a damaged stock-state adjustment inside the same transaction. Under-receipt closure does not mutate stock.
- Remaining risk: no supplier model, no dedicated unknown-barcode exception record, no receiving label printout, no route-level tests for over/under/damaged receipt, and over-receipt policy is permission-based rather than configurable per supplier/warehouse.

#### Phase 25: Put-Away Work Generation Foundation

- Status: partially hardened; put-away is no longer only a manual stock movement.
- What changed: linked `warehouse_work_lines` to `receiving_lines`, added put-away work listing/generation/confirmation APIs, suggested destination lookup from preferred put-away zones or active storage/picking fallback, Russian put-away task list, and partial completion with `completedQuantity`.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: workers can still use the simple manual flow, but now also see generated `Задания на размещение` and can create work from receiving sessions from the same Russian page.
- Architecture review: generated work is tenant-scoped and permission-gated; execution still moves stock through `StockMovementService` inside a transaction and references the work line in the movement.
- Remaining risk: no capacity model, no source/destination scan matching on generated work, no route-level put-away tests, no per-line destination override UI, and generated work can still be created from an in-progress receiving session.

#### Phase 26: Canonical Role-Based Access Control

- Status: hardened as a required MVP safety gate.
- What changed: added the canonical permission model (`org.manage`, `users.manage`, `wms.view`, `receiving.execute`, `putaway.execute`, `transfers.execute`, `adjustments.create`, `cycleCounts.*`, `picking.*`, `packing.execute`, `reports.view`, `audit.view`), mapped legacy `WMS_*` permissions as migration aliases, updated service-layer checks to canonical permissions, added role-aware route checks, added Russian `Недостаточно прав` UI, and added permission/cross-organization isolation tests.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: unavailable WMS navigation is hidden by role; direct unauthorized WMS page access shows Russian access-denied copy: `Недостаточно прав`, `У вас нет доступа к этому действию`, `Обратитесь к администратору`.
- Architecture review: backend/service checks remain authoritative; UI hiding is only a convenience layer. `WAREHOUSE_WORKER` can execute receiving, put-away, transfers, cycle counts, picking, and packing, but cannot adjust stock, approve count corrections, manage users, create warehouses, edit locations, or change settings. `VIEWER` remains read-only.
- Remaining risk: this is not yet full browser E2E authorization coverage, and API route-level tests still need to cover every route handler in addition to service-layer permission tests.

#### Phase 27: Production Blueprint Rewrite And Reservation Data Model

- Status: blueprint hardened and first allocation prerequisite added.
- What changed: replaced `docs/wms-production-blueprint.md` with a control document covering executive scope, product principles, reference alignment, domain objects, stock rules, RBAC, navigation, workflows, service architecture, frontend UX, production readiness, test blueprint, acceptance gates, and autonomous roadmap. Added additive `InventoryReservationStatus` and `InventoryReservation` schema with migration `20260522062000_inventory_reservations`.
- Validation: `pnpm prisma:generate` and `pnpm exec prisma migrate deploy` passed before the full validation run.
- UX review: no UI flow changed in this phase; the blueprint now makes Russian worker UX acceptance criteria explicit.
- Architecture review: reservation/allocation is now represented in the database but is not wired into stock-state reservation or picking. No existing stock behavior was changed.
- Remaining risk: the reservation service, reserve/release stock transitions, allocation-driven pick work, short-pick resolution, API tests, and E2E tests remain gaps.

#### Phase 28: Competitive Blueprint And Navigation Benchmark

- Status: competitive control docs created; implementation started with navigation consolidation.
- What changed: added `docs/wms-competitive-blueprint.md` based on mature WMS patterns from Dynamics 365, Oracle WMS Cloud, NetSuite WMS, Odoo Inventory/Barcode, SAP EWM-style operations, Zoho, Cin7, Fishbowl, and ShipHero-style fulfillment. Added `docs/wms-navigation-redesign.md` and updated the production blueprint to make competitive navigation the control source.
- Benchmark gaps added: warehouse workers should start from `Задачи`, product/barcode/stock/corrections should be grouped under `Товары и остатки`, pick/pack/ship should be grouped under `Сборка и упаковка`, movement/audit/reconciliation should be grouped under `Журнал`, and setup must be separated as `Склады` and `Настройки`.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: main navigation is now workflow-first and Russian: `Обзор`, `Задачи`, `Товары и остатки`, `Приёмка`, `Сборка и упаковка`, `Инвентаризация`, `Пополнение`, `Склады`, `Журнал`, `Настройки`. Technical pages remain as deep links under the hubs.
- Remaining risk: hub pages are not a substitute for a real task-center API; route/API/E2E tests still need to prove workflow execution from the redesigned navigation.

#### Phase 29: Real Task Center API

- Status: implemented as an operational aggregation layer; still needs browser/mobile E2E coverage.
- What changed: added `TaskCenterService`, `/api/tasks`, and a dynamic Russian `/wms/tasks` page that aggregates open receiving sessions, put-away work, replenishment work, manual transfers, picking work, packing work, and active cycle counts. The route is now hidden from `VIEWER` and requires an operational permission instead of plain read access.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: warehouse workers now start from an actionable Russian task list with status, next action, location/product context, loading state, empty states, and access-denied behavior inherited from route protection.
- Architecture review: the service is read-only, tenant-scoped by `storeId`, permission-gated server-side, and filters worker-visible warehouse work to unassigned or self-assigned work.
- Remaining risk: the task center does not yet support assignment changes, priority sorting beyond updated time, exception queues, or browser/mobile E2E proof of executing a task from the new screen.

#### Phase 30: Reservation Service And Stock-State Ledger

- Status: implemented at service/API foundation level; picking is not yet allocation-driven.
- What changed: added additive movement enum values `RESERVE` and `RELEASE_RESERVATION`, migration `20260522090000_reservation_movement_types`, `ReservationService`, `/api/reservations`, Russian movement/audit labels, Russian reservation errors, and DB smoke coverage for reserve, replay, release, cross-organization rejection, reserved quantity, available quantity, and ledger movement order.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: no new visible worker screen yet; API errors and movement labels are Russian. Allocation UI remains a gap for the picking page.
- Architecture review: reservation and release change `reservedQty` only through `StockMovementService`, create append-only movement rows, run in a transaction, preserve store isolation, and audit sensitive reservation changes.
- Remaining risk: `createPickWorkFromOrder` still selects balances directly instead of consuming reservations. Phase R3 must generate pick work from reservations, support split-bin lines, release reservations on cancel/short-pick, and expose a simple Russian allocation action in the picking flow.

#### Phase 31: Allocation-Driven Pick Work

- Status: implemented at service/UI foundation level; still needs dedicated route/E2E coverage and short-pick resolution.
- What changed: added optional `reservationId` on `warehouse_work_lines`, migration `20260522092000_work_line_reservation_link`, pick work generation from active reservations, one work line per reserved bin, Russian picking UI action `Зарезервировать и создать`, and transactional reserved-quantity release before `PICK` movement during line confirmation.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: the picking page now explains that stock is reserved before work starts and that confirmation removes the reserve before stock is picked. The worker still sees a simple scan location/product/quantity flow.
- Architecture review: picking no longer selects raw balances at work creation. Reservations are the source of executable work, `reservedQty` is released through `StockMovementService`, `PICK` remains append-only, and the DB smoke verifies the movement sequence.
- Remaining risk: no explicit reservation release on order cancel, no manager short-pick resolution, no browser/mobile E2E, no route-level test for `/api/reservations`, and no dedicated UI showing split-bin reservation details before work creation.

#### Phase 32: Short-Pick Resolution

- Status: implemented at foundation level; exception queue and E2E remain gaps.
- What changed: added `SHORT_PICKED` order status, migration `20260522094000_short_picked_order_status`, `resolveShortPickLine`, `/api/warehouse-work/lines/[id]/short-pick`, Russian `Недосбор` UI action, audit label, Russian errors, and DB smoke coverage for partial pick, remaining reservation release, short reservation status, and order status.
- Validation: `pnpm prisma:generate`, `pnpm exec prisma migrate deploy`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: managers can mark remaining quantity as `Недосбор` from the picking screen; workers still use the same scan-confirm flow. The UI remains Russian, but role-aware hiding for the manager-only short-pick button is still not implemented client-side.
- Architecture review: short-pick resolution releases only the remaining reserved quantity through `StockMovementService`, keeps `PICK` movements append-only, marks the reservation `SHORT`, and leaves the order in `SHORT_PICKED` instead of allowing packing.
- Remaining risk: no dedicated manager exception queue, no backorder/cancel/reallocate resolution, no browser/mobile E2E, and no route-level permission test for short-pick resolution.

#### Phase 33: UI Design System And Shared Primitive Hardening

- Status: partially implemented; active-page visual QA remains required before UI can be called complete.
- What changed: added `docs/wms-ui-design-system.md` and `docs/wms-ui-audit.md`, hardened shared form controls, native select styling, button variants, status badges, page headers, empty states, notice banners, scanner panels, workflow hubs, sidebar/mobile navigation, active nav state, and global WMS table styling.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: the shared layer now targets a calm Russian SaaS UI instead of browser-default scaffold controls. Selects have padding and custom arrows, statuses are centrally mapped, and worker scan panels have clearer hierarchy.
- Architecture review: UI-only changes; stock rules, transactions, ledger append-only behavior, permissions, and tenant isolation are unchanged.
- Remaining risk: not every page has been individually redesigned yet. Some screens still contain page-local loading/error blocks and dense admin sections. Browser/mobile visual smoke coverage remains missing.

#### Phase 34: UI Active Screen Consistency Pass

- Status: partially implemented; worker scanner flows and dense setup pages still need page-by-page polish.
- What changed: applied shared loading/error/success states, `cardClass`, `tableWrapClass`, and shared access-denied button/card styling to `Обзор`, `Штрихкоды`, `Остатки`, `История движений`, `Журнал действий`, and the access-denied component.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: high-traffic read/manager screens now have consistent Russian loading/error states, calmer card surfaces, and table wrappers. The UI still needs a deeper worker-flow pass for receiving, put-away, picking, packing, cycle count, and replenishment.
- Architecture review: UI-only changes; no stock, ledger, permission, or tenant-isolation behavior changed.
- Remaining risk: no browser/mobile visual smoke test yet; visual quality is improved but not fully audited across every active WMS page.

#### Phase 35: UI Worker Flow Polish Pass

- Status: partially implemented; mobile/browser visual QA and sticky scanner action areas remain gaps.
- What changed: applied shared loading, card, table, and scanner surface primitives to `Приёмка`, `Размещение`, `Сборка заказов`, `Упаковка`, `Инвентаризация`, and `Пополнение`; prevented picking/cycle count empty states from appearing before initial data load; made table wrappers horizontally scrollable for dense worker tables.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: worker flows are visually more consistent and less scaffold-like, with clearer loading states and calmer task surfaces. The screens are still operationally dense and need a browser/mobile visual pass before UI hardening can be called complete.
- Architecture review: UI-only changes; stock movement service, transactions, movement ledger, permissions, and tenant isolation are unchanged.
- Remaining risk: receiving/cycle-count tables still expose dense inline row controls, and there is no Playwright/mobile visual smoke test yet.

#### Phase 36: UI Admin And Utility Screen Consistency Pass

- Status: partially implemented; large admin pages still need decomposition and visual QA.
- What changed: applied shared loading/error/card/table/button primitives to `Товары`, `Склады`, `Ячейки`, `Настройки`, `Задачи`, `Перемещения`, `Корректировки`, and `Проверка остатков`; destructive product actions now use the danger button style; setup tables use the shared horizontally scrollable table wrapper.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: active WMS screens are now much less browser-default/scaffold-like and use consistent Russian feedback states. The main remaining UI blocker is not shared primitives anymore; it is visual/mobile QA and reducing density in the largest admin/worker tables.
- Architecture review: UI-only changes; no stock mutation, ledger, auth, permission, or tenant-isolation behavior changed.
- Remaining risk: no automated browser/mobile visual test yet, and the settings/products screens remain dense despite using consistent primitives.

#### Phase 37: UI Design Contract Tests

- Status: implemented as local regression coverage; browser/mobile visual testing remains a gap.
- What changed: added `src/app/wms/uiDesignContracts.test.ts` to enforce shared `PageHeader` usage, block removed scaffold classes, and require shared loading/error/workflow feedback primitives on active WMS pages.
- Validation: focused `pnpm test src/app/wms/uiDesignContracts.test.ts`, `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: the test does not judge aesthetics, but it prevents the most obvious regression back to raw scaffold styling.
- Architecture review: test-only change; stock, ledger, permissions, auth, and tenant isolation are unchanged.
- Remaining risk: no Playwright/browser/mobile visual smoke yet because no E2E stack is installed in the repo.

#### Phase 38: Browser UI Smoke Harness And Scanner Form Fix

- Status: implemented as no-dependency browser smoke; full Playwright workflow E2E remains a gap.
- What changed: added `pnpm ui:smoke` and `scripts/wms-ui-smoke.mjs`, which starts Next with safe dev auth fallback and captures desktop/mobile screenshots for representative WMS pages using headless Chrome. Fixed `ScanField` and `ScannerInput` so scanner inputs no longer render nested forms; Enter and the scan button still submit scans, and mobile autofocus no longer scrolls the receiving page into a broken blank view.
- Validation: `pnpm ui:smoke`, `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` passed.
- UX review: this catches blank mobile screens and obvious broken scaffold rendering. The receiving mobile screenshot now starts with the Russian page header and scanner guidance instead of a blank viewport.
- Architecture review: UI/test harness changes only; stock, permissions, auth, and tenant isolation remain unchanged.
- Remaining risk: smoke screenshots do not execute full receive/pick/pack workflows; Playwright-style browser E2E remains needed for production sign-off.

#### Phase 39: Product-Grade UI Foundation And Library Adoption

- Status: partially implemented; page migration remains active.
- What changed: adopted product-grade UI/runtime dependencies (`lucide-react`, Radix Select/Dialog/Dropdown/Tabs/Popover, React Hook Form, Zod, TanStack Table, Sonner, date-fns, Papaparse/XLSX, Playwright), added `docs/wms-ui-product-redesign.md`, created shared UI primitives in `src/components/ui`, replaced fake letter navigation icons with real lucide icons, replaced the meaningless empty-state circle with an icon-based empty state, and made `selectClass` a real native fallback instead of an input alias.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and `pnpm test:e2e` passed.
- UX review: the app is moving toward a serious SaaS foundation, but many active screens still need migration from native selects/custom dense sections to the new primitives.
- Architecture review: UI/dependency changes only; no stock mutation, ledger, auth, permission, or tenant-isolation behavior changed.
- Remaining risk: dependency surface increased and must be guarded by continued build/test validation. E2E is now present but not yet complete scanner click-through coverage.

#### Phase 40: Operational Dashboard And Playwright E2E Foundation

- Status: partially implemented; pending full validation.
- What changed: redesigned `/wms` from passive metrics into an operational command center that prioritizes receiving, put-away, picking, and discrepancies. Added Playwright config and `e2e/wms-operational-ui.spec.ts` covering protected login, Russian workflow navigation, UI product creation, UI warehouse creation with Radix Select, API-backed receive/put-away/transfer/cycle-count/pick/pack flow verified through UI pages, and Russian access-denied state for a viewer.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and `pnpm test:e2e` passed.
- UX review: the dashboard now answers what requires action now. E2E still needs more click-through scanner coverage before product UI hardening can be considered done.
- Architecture review: workflow stock changes in E2E still go through existing API/services and therefore through `StockMovementService`; the UI phase itself did not alter stock logic.
- Remaining risk: Playwright tests require seeded admin credentials and a reachable local database. The new E2E is meaningful but still not a substitute for full mobile scanner workflow tests.

#### Phase 41: Active WMS Select Migration

- Status: implemented and validated.
- What changed: migrated all active WMS native `<select>` controls to the shared Radix `Select` primitive, including receiving, put-away, transfers, picking, packing, cycle counts, adjustments, replenishment, warehouses/locations, products, barcodes, inventory, movements, audit, and settings. Added empty-value support to the shared Select for filters and optional variant/zone fields.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and a sequential `pnpm test:e2e` passed. An earlier parallel run of `pnpm ui:smoke` and `pnpm test:e2e` caused transient Next dev host/cache contention and was discarded.
- UX review: select arrows, padding, trigger height, focus states, and dropdown panels are now consistent across active WMS screens.
- Architecture review: UI-only change; stock logic, tenant isolation, permissions, and audit behavior are unchanged.
- Remaining risk: large forms still need better grouping/tabs and some worker screens still need true handheld step-by-step click-through redesign.

#### Phase 42: Active WMS DataTable Migration

- Status: implemented and validated.
- What changed: added `src/components/ui/DataTable.tsx` using TanStack Table and migrated all active WMS page-local raw table markup to the shared `DataTable` surface. This includes stock balances, movement history, audit logs, warehouses, products, locations, barcode labels, reconciliation discrepancies, receiving lines, cycle count lines, and settings user access. Removed the unused legacy `tableWrapClass` export and added a UI contract test that blocks raw page-local `<table>` and `tableWrapClass` usage from returning. Fixed a receiving workflow bug found during the migration: receiving a line now posts to that line's session instead of the currently selected add-line session.
- UX review: active table surfaces now share row height, header styling, alignment, responsive overflow, and hover states. This is a meaningful SaaS polish step, but the receiving and cycle-count line rows still need mobile card variants because inline controls remain dense.
- Architecture review: stock mutation rules remain unchanged. The receiving route fix makes the UI safer without changing service boundaries; receive operations still go through the existing receiving API and stock service.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and sequential `pnpm test:e2e` passed.
- Remaining risk: row actions still use page-local buttons instead of shared dropdown/action menus, and worker line tables need mobile-specific scanner cards before UI hardening can be called complete.

#### Phase 43: Shared Row Action Menu

- Status: implemented and validated at UI foundation level.
- What changed: added `ActionMenu` on top of the existing Radix dropdown primitive, added disabled-state support to dropdown items, and migrated crowded row actions for warehouses, locations, products, product variants, and settings user access to compact shared menus.
- UX review: admin tables now feel less cramped and less like database scaffolding. Destructive actions are still visible inside the menu with danger styling and disabled state where applicable.
- Architecture review: UI-only change; no stock, auth, permission, tenant-isolation, or ledger behavior changed.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and sequential `pnpm test:e2e` passed.
- Remaining risk: some operational pages intentionally keep explicit action buttons because workers need direct next actions. Future passes should add menus only where they reduce clutter without hiding the primary warehouse task.

#### Phase 44: Responsive DataTable Rows

- Status: implemented and validated at shared component level.
- What changed: updated `DataTable` so desktop tables become labeled stacked rows on small screens. This improves stock, movement, audit, product, warehouse, location, receiving, cycle-count, reconciliation, and settings tables without duplicating mobile markup in every page.
- UX review: mobile/scanner users no longer have to interpret compressed desktop table headers on the shared data surfaces. Dense quantity workflows still need purpose-built worker cards and sticky actions.
- Architecture review: UI-only change; no stock, auth, permission, tenant-isolation, or ledger behavior changed.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and sequential `pnpm test:e2e` passed.
- Remaining risk: responsive stacked rows are a foundation, not a complete scanner workflow redesign.

#### Phase 45: Production Library Stack Adoption

- Status: implemented and validated at foundation level.
- What changed: added `docs/wms-library-adoption-plan.md`, installed missing `@radix-ui/react-tooltip`, `@hookform/resolvers`, `@tanstack/react-query`, and `@types/papaparse`; added root React Query provider and Sonner toaster; added shared API client, date formatter, Zod schemas, and server schema parser; migrated product and warehouse forms/API routes to shared Zod validation; migrated product and warehouse screens to React Query mutations and Russian toasts; added CSV/XLSX product import preview with Papaparse/XLSX; added Radix Tooltip primitive; extended `DataTable` with sortable headers and pagination.
- UX review: product and warehouse workflows now feel more like a mature SaaS surface: field errors are local, success/failure feedback is immediate, import has preview and row errors, and tables expose sorting/pagination.
- Architecture review: services remain authoritative for business rules; schema validation is an input layer and does not bypass stock, permission, tenant, or audit rules.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and sequential `pnpm test:e2e` passed.
- Remaining risk: location, receiving, transfer, adjustment, cycle count, picking, users, and settings forms still need migration to React Hook Form/Zod/React Query. Playwright remains foundation-level for scanner workflows.

#### Phase 46: WMS Tooling Strategy And Scanner/Label Integration

- Status: implemented and validated.
- What changed: added `docs/wms-tooling-and-library-strategy.md`; selected and installed `@zxing/browser`, `bwip-js`, `exceljs`, and `pino`; added camera barcode scanning to the shared scanner field; added Code 128/QR SVG rendering with `bwip-js`; added barcode previews and printable label sheets to `/wms/barcodes`; added ExcelJS product import template download; replaced unexpected API `console.error` with structured Pino logging.
- UX review: scanner fields now support hardware keyboard scanners, manual input, and camera fallback. Barcode labels are no longer just CSV records; users can preview and print physical labels.
- Architecture review: scanner/label tooling does not mutate stock. Product template generation is permission protected. Pino is system logging only and remains separate from audit logs.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and sequential `pnpm test:e2e` passed.
- Remaining risk: camera scanning needs real-device warehouse testing; browser print is an MVP label strategy, not a guaranteed calibrated PDF label system.

#### Phase 47: Repository Consistency Check

- Status: implemented; full validation pending in this phase report.
- What changed: ran `pnpm install` and confirmed `package.json`/lockfile already list the libraries used by code and claimed by docs. Verified navigation uses lucide React components instead of string placeholders. Tightened `EmptyState` to support `description`, `action`, semantic variants, and exported WMS-specific icon presets while preserving existing `body` callers. Added UI design contract tests for real nav icons and the stronger empty-state API.
- UX review: no fake navigation letter icons are present in active nav code; empty states can use meaningful workflow icons and clearer descriptions.
- Architecture review: consistency-only change; no stock, permission, auth, tenant, or ledger behavior changed.
- Remaining risk: several active pages still use the default empty-state icon instead of a page-specific preset and should be improved during continued UI hardening.
