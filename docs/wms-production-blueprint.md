# Standalone WMS Production Blueprint

## Scope Correction

This repository is a standalone warehouse management system product. It is not an integration into another retail platform, and it should not depend on any external application, commerce, or permission assumptions.

The current product direction is a practical WMS for small and medium retail, wholesale, and e-commerce operations. The app owns its own tenants, users, products, warehouses, inventory balances, warehouse work, and movement history.

## Audit Of Incorrect Assumptions

The following product assumptions were found and corrected:

- `docs/wms-production-blueprint.md` described the target as another platform's WMS. It now describes this repository as the standalone WMS source of truth.
- `src/lib/wmsText.ts` used a product-specific app title. It should use neutral standalone WMS naming.
- `AGENTS.md` described this work as a module inside another full-stack product. It should describe this repository as the standalone WMS product.
- `docs/wms-mvp-implementation.md` mentioned preserving unrelated external flows. In this repository the relevant rule is to preserve existing standalone WMS, product, order, tenant, and inventory behavior.

The database model still uses `Store` and `storeId`. In this standalone system, that is the current tenant/company/store boundary. It should be treated as the organization's operating unit, not as an external platform integration. A destructive table rename is intentionally not part of this cleanup phase.

## Product Vision

The standalone WMS helps teams know where stock is, receive goods without spreadsheets, move items between ячейки, count inventory safely, and collect orders with fewer mistakes.

Target users:

- Владелец или директор: sees warehouse health, pending tasks, stock accuracy, and exceptions.
- Складской сотрудник: scans, receives, moves, counts, and picks goods with step-by-step screens.
- Менеджер: checks остатки, movement history, order readiness, and count discrepancies.
- Администратор: manages users, roles, warehouses, locations, correction permissions, and setup.

The MVP includes:

- tenants/companies/stores as the operating boundary;
- users and roles;
- products and variants;
- warehouses, zones, locations, and location barcodes;
- inventory balances by location;
- append-only inventory movement ledger;
- receiving and put-away;
- internal transfers;
- stock adjustments;
- cycle counts with approval;
- simple order picking;
- scanner-friendly Russian UX;
- WMS dashboard, settings, and movement history.

The MVP intentionally excludes:

- wave picking;
- batch picking;
- route optimization;
- robotics;
- EDI;
- carrier automation;
- cartonization;
- dock or yard management;
- 3PL multi-client logic;
- advanced labor analytics;
- packing and shipping automation, which remain future modules.

## UX Principles

The interface is Russian-first. All WMS labels, actions, empty states, validation errors, statuses, and worker prompts should be Russian.

Worker screens should be simple, step-by-step, and scanner-friendly. Each operational screen must answer:

- Что нужно сделать?
- Где товар?
- Сколько?
- Что сканировать?
- Что будет после подтверждения?

Operational screens should use one focused input at a time, Enter-compatible scan handling, large tap targets, clear next action, and short success/error messages.

The main worker UI should avoid enterprise jargon. Use words like `Ячейка`, `Задание`, `Шаг`, `Остаток`, `Недоступно`, `Требует проверки`, `Собрать`, `Разместить`, and `Принять`.

Owner/admin screens can use tables, filters, and settings, but they should still avoid raw enum names.

## Production WMS Reference Model

This product uses established WMS patterns from systems such as Dynamics 365 Warehouse Management, Oracle WMS Cloud, NetSuite WMS, Odoo Inventory/Barcode, and SAP EWM-style task/bin concepts. The implementation keeps the useful concepts but exposes a simpler SMB-friendly UI.

Core concepts:

- `Tenant / Company / Store`: the organization's operating boundary. Current schema name is `Store`.
- `User`: person using the WMS.
- `Role`: permission profile such as admin, manager, staff, or cashier.
- `Product`: sellable or trackable SKU.
- `Product Variant`: product option with its own SKU/barcode when needed.
- `Warehouse / Склад`: physical warehouse or store-room.
- `Zone / Зона`: optional grouping inside a warehouse.
- `Location / Ячейка`: physical bin, shelf, dock, receiving area, damaged area, or picking area.
- `Inventory balance / Остаток`: location-level physical and availability quantities.
- `Movement ledger / История движений`: append-only record of stock changes.
- `Warehouse work / Складское задание`: header for executable warehouse work.
- `Work line / Шаг задания`: one executable scan/quantity action inside a work header.
- `Receiving / Приёмка`: receive goods into a receiving location.
- `Put-away / Размещение`: move goods from receiving into storage or picking.
- `Transfer / Перемещение`: move goods between locations.
- `Adjustment / Корректировка`: controlled stock correction.
- `Cycle count / Инвентаризация`: counted stock snapshot and approval flow.
- `Picking / Сборка заказа`: collect order items from pickable locations.
- `Packing / Shipping`: future modules.

## Information Architecture

Final Russian navigation:

- `Обзор`
- `Склады и ячейки`
- `Товары`
- `Остатки`
- `Приёмка`
- `Размещение`
- `Перемещения`
- `Сборка заказов`
- `Инвентаризация`
- `История движений`
- `Проверка остатков`
- `Журнал действий`
- `Настройки`

Worker-first screens:

- `Приёмка`
- `Размещение`
- `Перемещения`
- `Сборка заказов`
- `Инвентаризация`

Manager/admin screens:

- `Обзор`
- `Склады и ячейки`
- `Товары`
- `Остатки`
- `История движений`
- `Проверка остатков`
- `Журнал действий`
- `Настройки`

## User Flows

### Create Warehouse

- Screen: `Склады и ячейки`.
- Action: admin enters name and code, then saves an active warehouse.
- Validation: required name/code, unique code inside tenant, permission check.
- Success: `Склад создан`.
- Error: `Склад с таким кодом уже есть`.

### Create Locations

- Screen: `Склады и ячейки`.
- Action: choose warehouse, optional zone, code, optional barcode, type, and flags.
- Validation: unique code inside warehouse, unique barcode inside tenant, active warehouse, permission check.
- Success: `Ячейка создана`.
- Error: `Штрихкод уже используется`.

### Receive Stock

- Screen: `Приёмка`.
- Action: create/select receiving session, scan product, enter quantity, confirm.
- Validation: active receiving location, product belongs to tenant, session is not completed.
- Success: `Товар принят`.
- Error: `Приёмка уже завершена`.

### Put Away Stock

- Screen: `Размещение`.
- Action: choose receiving stock, scan destination ячейка, confirm quantity.
- Validation: enough receiving stock, active storage/picking destination.
- Success: `Товар размещён`.
- Error: `Недостаточно товара в зоне приёмки`.

### Transfer Stock

- Screen: `Перемещения`.
- Action: scan source location, scan product, scan destination, enter quantity, confirm.
- Validation: enough available stock, different locations, active source/destination.
- Success: `Товар перемещён`.
- Error: `Нельзя переместить больше, чем есть в ячейке`.

### Adjust Stock

- Screen: `Остатки` or controlled manager flow.
- Action: choose location, product, reason, quantity delta, and note.
- Validation: adjustment permission, manual correction requires note, negative stock blocked by default.
- Success: `Остаток обновлён`.
- Error: `Нельзя списать больше, чем есть в наличии`.

### Cycle Count

- Screen: `Инвентаризация`.
- Action: create count by warehouse/location, scan/count products, submit, approve.
- Validation: no stock change before approval, approval permission required.
- Success: `Инвентаризация утверждена`.
- Error: `Проверьте количество перед подтверждением`.

### Pick Order

- Screen: `Сборка заказов`.
- Action: create/select pick work, scan source location, scan product, confirm picked quantity.
- Validation: active pickable source, matching scan values, enough source stock, line not completed.
- Success: `Задание завершено`.
- Error: `Отсканирован другой товар`.

### View Stock

- Screen: `Остатки`.
- Action: search product/location, filter by warehouse/status.
- Validation: tenant access.
- Success: stock rows show physical, unavailable, and available quantities.
- Error: `Остатки не найдены`.

### View Movement History

- Screen: `История движений`.
- Action: filter by product, location, type, and date.
- Validation: tenant access, read-only ledger.
- Success: movement ledger displays business labels.
- Error: `Движения не найдены`.

## Data Model Blueprint

Existing models to keep:

- `User`
- `Store` as tenant/company/store operating boundary
- `StoreUser`
- `Product`
- `ProductVariant`
- `CustomerOrder`
- `CustomerOrderLine`
- `AuditLog`
- `Warehouse`
- `WarehouseZone`
- `WarehouseLocation`
- `InventoryLocationBalance`
- `InventoryMovement`
- `ReceivingSession`
- `ReceivingLine`
- `WarehouseWork`
- `WarehouseWorkLine`
- `CycleCountSession`
- `CycleCountLine`

Important modeling rules:

- Keep `warehouse_work` and `warehouse_work_lines`. Do not collapse work into one flat task table.
- Keep physical stock separate from reservation/allocation state.
- Keep movement history append-only.
- Treat `storeId` as tenant isolation. Do not cross tenant boundaries in reads or writes.
- Future hardening may introduce `Organization` naming at the UI/service boundary, but physical table renaming is not required for MVP.

Potential future additive models:

- `BarcodeLabel`: normalized scan registry for product/location/order/work labels.
- `Reservation`: future allocation model separate from physical locations.
- `PackingSession` and `Shipment`: future post-pick modules.

## Stock Model Rules

Physical stock:

- `onHandQty` is the physical quantity in a location.

Availability:

- `availableQty = onHandQty - reservedQty - pickedQty - damagedQty - blockedQty`.

Quantity states:

- `reservedQty`: allocated for future picking, not physically moved.
- `pickedQty`: physically picked but not shipped; MVP currently decrements on pick and should harden this before packing/shipping.
- `damagedQty`: physical stock that is not sellable.
- `blockedQty`: physical stock held for investigation/quarantine.

Movement ledger:

- append-only;
- no public update/delete route;
- every stock mutation creates a movement;
- movement and balance update run in one transaction;
- movement records tenant, warehouse/location, product, variant key, quantity, reason/reference, and user.

Safety rules:

- no direct stock mutation outside `StockMovementService`;
- negative stock blocked by default;
- explicit admin correction requires note and audit;
- all stock-changing operations run in transactions;
- every query and mutation is tenant-scoped;
- worker UI never exposes raw stock internals unless required for the task.

## Backend Architecture

Core services:

- `WarehouseService`: warehouse CRUD/status.
- `LocationService`: zone/location CRUD, barcode uniqueness, worker-safe location lookup.
- `StockMovementService`: only service allowed to mutate inventory balances.
- `ReceivingService`: receiving sessions, lines, receive, complete.
- `PutawayService`: put-away from receiving to storage/picking.
- `TransferService`: internal movement.
- `AdjustmentService`: controlled stock corrections.
- `CycleCountService`: snapshot, count entry, submission, approval.
- `PickingService`: pick work from orders and pick confirmation.
- `BarcodeService`: scan resolution for products, variants, locations, orders, and work.
- `DashboardService`: operational metrics and exceptions.
- `AuditService`: audit event storage.

Hardening priorities:

- keep stock mutations in `StockMovementService`;
- formalize tenant/company wording while preserving safe `storeId` schema;
- strengthen production auth beyond seed/fallback headers;
- add e2e scanner workflow checks;
- add DB-level protection for append-only movements where practical;
- add clearer operational error codes and Russian copy.

## Frontend Architecture

Screens:

- `Обзор`: metrics, recent movements, pending work, discrepancies.
- `Склады и ячейки`: admin table/forms for warehouses, zones, locations, and barcodes.
- `Остатки`: searchable stock table with available/unavailable quantities.
- `Приёмка`: scanner-first receiving flow.
- `Размещение`: worker cards for receiving stock awaiting put-away.
- `Перемещения`: source/product/destination/quantity scanner wizard.
- `Сборка заказов`: task list and one-line-at-a-time pick confirmation.
- `Инвентаризация`: count task list, scan/count entry, approval.
- `История движений`: filtered ledger.
- `Настройки`: product setup, permissions overview, barcode/settings hardening.

Components:

- `ScannerStepLayout`
- `ScanField`
- `WorkerTaskCard`
- `RussianStatusBadge`
- `QuantityStepper`
- `ConfirmActionPanel`
- `WmsTable`
- `EmptyState`
- `ErrorBanner`
- `SuccessToast`

## Russian UX Copy

Labels:

- `Склады`
- `Ячейки`
- `Зоны`
- `Остатки`
- `Приёмка`
- `Размещение`
- `Перемещение`
- `Сборка заказов`
- `Инвентаризация`
- `История движений`
- `Настройки`
- `Активно`
- `Недоступно`
- `Требует проверки`
- `Завершено`
- `В работе`
- `Черновик`

Buttons:

- `Создать`
- `Сохранить`
- `Начать`
- `Подтвердить`
- `Завершить`
- `Отменить`
- `Сканировать`
- `Принять товар`
- `Разместить товар`
- `Собрать`
- `Утвердить`

Scanner prompts:

- `Отсканируйте ячейку`
- `Отсканируйте товар`
- `Укажите количество`
- `Проверьте количество перед подтверждением`

Success messages:

- `Товар принят`
- `Товар размещён`
- `Товар перемещён`
- `Остаток обновлён`
- `Задание завершено`

Errors:

- `Недостаточно товара в выбранной ячейке`
- `Нельзя списать больше, чем есть в наличии`
- `Отсканирован другой товар`
- `Отсканирована другая ячейка`
- `Нет доступа к этим данным`
- `Заполните обязательные поля`

Empty states:

- `Пока нет складов. Создайте первый склад, чтобы добавить ячейки.`
- `В этой ячейке пока нет товара.`
- `Нет заданий для сборки. Новые заказы появятся здесь.`
- `Нет товаров для размещения. Сначала выполните приёмку.`

## Current Implementation Reassessment

Current status: usable as a standalone MVP for internal pilot workflows, with a production-oriented local email/password session default. It is still not fully hardened for public multi-tenant SaaS deployment.

Works today:

- standalone Next.js/Prisma/Postgres app scaffold;
- local Docker PostgreSQL setup;
- tenant-scoped users/roles/products/orders;
- warehouses, zones, and locations;
- location barcode/code management;
- balance and movement ledger;
- central transactional stock movement service;
- receiving, put-away, transfers, adjustments, cycle counts, simple picking;
- Russian WMS navigation and most worker copy;
- dashboard and movement history;
- unit tests for critical stock rules;
- typecheck, lint, tests, and build previously passed.

Not production-hardened yet:

- authentication has email/password sessions, but still lacks invite emails, password reset, rate limiting, account lockout, 2FA, and SSO;
- tenant/company naming is still implemented with `Store` in schema and service context;
- no browser/e2e tests for scanner flows;
- no DB trigger or policy preventing direct movement updates outside application code;
- picked/reserved/blocked/damaged state exists in balances but operational flows are still MVP-level;
- picking does not split one order line across multiple bins;
- packing/shipping is intentionally absent;
- barcode labels are resolved directly from existing records, not a dedicated registry;
- admin settings for users/roles/products are minimal;
- observability, rate limiting, backups, and production deployment hardening are not complete;
- dependency security upgrade pass is still needed.

Conclusion: the app is not just a static draft. It has working standalone WMS behavior through API and UI, but it still needs WMS hardening before real production rollout.

## Autonomous Hardening Roadmap

The roadmap is not a fixed feature-phase list. Phases may be split when a step becomes too large, and the blueprint should be updated when implementation reality changes.

### Phase A: Standalone Product Correction

- Business goal: remove incorrect external-platform assumptions.
- Technical scope: update app naming, AGENTS guidance, blueprint, old implementation notes, and public tenant wording.
- Files/modules: `AGENTS.md`, `docs/wms-production-blueprint.md`, `docs/wms-mvp-implementation.md`, `src/lib/wmsText.ts`, `src/server/http.ts`, seed data if visible names are product-facing.
- DB impact: none.
- Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Self-review: no external-platform assumptions remain in docs/UI; `Store` is documented as tenant/company boundary.
- Continue when: search confirms no product-specific target references remain.
- Stop when: terminology cleanup requires destructive table renames.

### Phase B: Production Auth And Tenant Boundary Plan

- Business goal: make standalone tenant access explicit and safe.
- Technical scope: document and implement a non-fallback request context path; keep fallback only for local development if explicitly gated.
- Files/modules: `src/server/auth.ts`, `src/server/storeAccess.ts`, route tests, docs.
- DB impact: none initially.
- Validation: typecheck, lint, focused auth tests, build.
- Self-review: no production route silently picks the first active user/store.
- Continue when: development seed flow still works, production mode requires explicit context.
- Stop when: a full auth provider decision is required.

### Phase C: Tenant/User/Admin Settings

- Business goal: make standalone administration usable without code edits.
- Technical scope: simple Russian settings for current tenant, users, roles, and product seed/demo status.
- Files/modules: `src/app/wms/settings`, user/store/product APIs, permission helpers.
- DB impact: additive fields only if needed.
- Validation: typecheck, lint, relevant tests, build.
- Self-review: permissions protect admin actions; no enterprise settings exposed.
- Continue when: admin can see who has access and which tenant is active.
- Stop when: full invite/password/auth flow becomes required.

### Phase D: Scanner Flow Browser Tests

- Business goal: verify real worker flows, not only service functions.
- Technical scope: add Playwright or Next-compatible browser tests only if dependency already exists or can be justified; otherwise add lightweight route/UI smoke tests.
- Files/modules: test config, scanner flow tests.
- DB impact: test database setup only.
- Validation: typecheck, lint, tests, build.
- Self-review: receiving, put-away, transfer, count, and picking have a smoke path.
- Continue when: tests can run locally without external services beyond Postgres.
- Stop when: adding a new test library requires network install approval.

### Phase E: Append-Only Ledger Hardening

- Business goal: protect movement history beyond route design.
- Technical scope: add service-level no-update/no-delete tests and evaluate DB-level trigger/policy for movement immutability.
- Files/modules: migrations, tests, `StockMovementService`.
- DB impact: possible additive trigger migration; no data rewrite.
- Validation: prisma generate, migrate, typecheck, tests, build.
- Self-review: stock movements cannot be changed through public API or service helpers.
- Continue when: immutability protection is verified.
- Stop when: trigger behavior differs across environments.

### Phase F: Stock State Operational Hardening

- Business goal: make available/reserved/picked/damaged/blocked semantics consistent in operations.
- Technical scope: refine adjustment reasons, damaged/blocked corrections, picked handling, and availability display.
- Files/modules: stock engine/service, adjustment service/UI, picking service/UI, inventory UI, tests.
- DB impact: none unless additive reason metadata is needed.
- Validation: typecheck, lint, focused stock tests, build.
- Self-review: no operation promises availability it does not enforce.
- Continue when: tests cover blocked/damaged/picked edge cases.
- Stop when: reservation policy requires product decision.

### Phase G: Barcode Registry Decision

- Business goal: prevent scan ambiguity and support labels.
- Technical scope: either keep direct record barcode resolution with stronger ambiguity UX, or add additive `barcode_labels`.
- Files/modules: `BarcodeService`, possible migration, settings UI, tests.
- DB impact: additive only if registry is chosen.
- Validation: prisma generate if needed, typecheck, lint, tests, build.
- Self-review: scans resolve predictably and errors are clear in Russian.
- Continue when: product/location/order/work scan paths are deterministic.
- Stop when: label printing requirements expand scope.

### Phase H: Picking And Reservation MVP Hardening

- Business goal: make order collection safer for real warehouses.
- Technical scope: short-pick status, optional line split across bins, reserved quantity policy, and clear `Требует проверки` state.
- Files/modules: picking service/UI, warehouse work lines, order service, tests.
- DB impact: additive fields only.
- Validation: prisma generate if needed, typecheck, lint, picking tests, build.
- Self-review: picking does not silently overpromise stock; no packing/shipping creep.
- Continue when: worker can handle shortage without corrupting stock.
- Stop when: order lifecycle decisions require business approval.

### Phase I: Production Operations Checklist

- Business goal: prepare for deployment.
- Technical scope: health endpoint, env validation, dependency security upgrade plan, backup/migration notes, Docker health checks, observability notes.
- Files/modules: docs, config, docker compose, startup checks.
- DB impact: none.
- Validation: typecheck, lint, tests, build, local db smoke.
- Self-review: production risks are explicit and actionable.
- Continue when: MVP is deployable with documented caveats.
- Stop when: infrastructure choice is required.

## Phase Completion Routine

After every phase:

- run relevant validation;
- fix WMS-caused failures before continuing;
- self-review stock-service boundary, transactions, append-only ledger, tenant isolation, permissions, Russian UX, and MVP scope;
- update this blueprint if roadmap or architecture changes;
- report phase completed, changes, files, validation, UX review, architecture review, risks, roadmap adjustment, and next phase.

## Implementation Progress

### Phase A Completed: Standalone Product Correction

- Corrected product framing to standalone WMS.
- Removed product-specific app title and replaced it with neutral `WMS`.
- Updated local agent guidance to standalone WMS rules.
- Documented `Store`/`storeId` as the current tenant/company/store boundary.
- Updated visible seed names to Russian demo data.
- Validation passed: typecheck, lint, tests, build.

### Phase B Completed: Production Auth And Tenant Boundary Guard

- Added `ALLOW_DEV_AUTH_FALLBACK` support.
- Development fallback auth is now explicit and disabled by default.
- Production blocks fallback auth unless explicitly enabled.
- Partial explicit context headers are rejected.
- Added tests for auth fallback policy.
- Validation passed: typecheck, lint, tests, build.

### Phase C Completed: Tenant/User/Admin Settings

- Added a settings overview API for active organization, current user, permissions, and setup counts.
- Replaced static settings copy with a Russian standalone WMS settings screen.
- Kept administration intentionally lightweight; invite and password reset are still future hardening items.
- Validation passed: typecheck, lint, tests, build.

### Phase D Completed: Scanner Flow Contract Tests

- No browser test stack exists in the project, so this phase was split into lightweight static contract tests.
- Added tests that operational pages keep the scanner layout and notices.
- Added tests that the reusable scan field remains keyboard-scanner compatible.
- Validation passed: typecheck, lint, tests, build.

### Phase E Completed: Append-Only Ledger Hardening

- Added an additive PostgreSQL trigger migration that blocks update/delete on `inventory_movements`.
- Expanded stock boundary tests to reject application-level movement update/delete calls.
- No movement data is rewritten by the migration.
- Validation passed: prisma generate, typecheck, lint, tests, build.

### Phase F Completed: Stock State API/UI Alignment

- Added a central unavailable quantity helper for reserved, picked, damaged, and blocked stock.
- Inventory balance API now returns `unavailableQty` alongside `availableQty`.
- The `Остатки` UI shows the unavailable breakdown in Russian.
- Validation passed: typecheck, lint, tests, build.

### Phase G Completed: Barcode Resolution Hardening

- Added scan normalization for common scanner control characters.
- Added strict barcode entity type parsing instead of silently ignoring invalid type filters.
- Added Russian public error copy for invalid scan type.
- Validation passed: typecheck, lint, tests, build.

### Phase H Completed: Picking Shortage Review Marker

- Added additive `exceptionReason` support on warehouse work lines.
- Partial pick confirmations now mark the line as `Требует проверки`.
- Completing the remaining quantity clears the review marker.
- Added rule tests for partial-pick review behavior.
- Validation passed: prisma generate, typecheck, lint, tests, build.

### Phase I Completed: Production Operations Basics

- Added `/api/health` to check runtime app and database readiness without requiring user context.
- Health output reports only safe operational status and auth mode.
- Docker Compose already includes a PostgreSQL health check on port `5433`.
- Validation passed: typecheck, lint, tests, build.

### Phase J Completed: Reference Alignment And Email/Password Sessions

- Added `docs/wms-reference-alignment.md` to map the standalone WMS against Dynamics 365 Warehouse Management, Oracle WMS Cloud, NetSuite WMS, Odoo Inventory/Barcode, and SAP EWM-style concepts.
- Added production-oriented auth defaults: email/password login, salted `scrypt` password hashes, server-side `UserSession` records, HTTP-only session cookie, logout, protected WMS/API middleware, session-backed organization context, Russian login/access-denied errors, and seed admin password instructions.
- Added standalone production roles: `OWNER`, `WAREHOUSE_MANAGER`, `WAREHOUSE_WORKER`, and `VIEWER`, while preserving legacy roles for compatibility.
- Validation passed: prisma generate, prisma migrate, prisma seed, typecheck, lint, tests, DB smoke, build.
- Remaining auth hardening: invite flow, password reset, rate limiting, account lockout, 2FA/SSO, session rotation on organization switch, and browser/route permission matrix.

### Phase K Completed: Simple Work Templates And Location Directives

- Added additive `warehouse_work_templates` and `warehouse_location_directives` tables.
- Added Russian settings UI for simple rules: default receiving location, preferred put-away zone, priority pick location, damaged location, replenishment source zone, and replenishment destination zone.
- Added `WarehouseRuleService` and `/api/warehouse-rules`.
- Receiving can use the configured default receiving location when a location is not provided.
- Pick work source selection honors configured priority pick locations.
- Seed data creates a default pick template and default receiving/pick directives.
- Validation passed: prisma generate, migration/status check, prisma seed, typecheck, lint, tests, DB smoke, build.
- Remaining directive hardening: directed put-away suggestions, replenishment generation, rule conflict diagnostics, and full route/browser permission tests.

### Phase L Completed: MVP Replenishment

- Added `replenishment_rules`, `REPLENISHMENT` work type, and `completedQuantity` for non-pick work-line execution.
- Added `ReplenishmentService`, `/api/replenishment`, and Russian `Пополнение` page.
- Admins can create min/max rules for a product in a pick location with a source location or source zone.
- Users can generate replenishment work and confirm source, destination, product, and quantity with scanner-friendly fields.
- Confirmation moves stock through `StockMovementService` as a transactional `TRANSFER` movement.
- DB smoke now covers replenishment rule creation, work generation, confirmation, resulting balances, and ledger reconciliation.
- Validation passed: prisma generate, migration/status check, prisma seed, typecheck, lint, tests, DB smoke, build.
- Remaining replenishment hardening: scheduled generation, priority queue, source optimization, exception handling, route/browser tests.

### Phase M Completed: Whole-Command Idempotency For Receiving And Picking

- Added workflow-level idempotency on top of movement-level idempotency.
- Receiving and picking now claim the idempotency key before line-status mutation, then attach the resulting movement to the command.
- Duplicate receive/pick submissions with the same payload return safely without duplicating stock or workflow updates.
- Conflicting reuse of the same key is rejected.
- UI sends stable in-flight keys for receive and pick confirmations to reduce mobile/scanner double-submit risk.
- Validation passed: typecheck, lint, tests, DB smoke, build.
- Remaining idempotency hardening: replenishment confirmation and future packing/shipping commands.

### Phase N Completed: Packing And Shipping Handoff Foundation

- Added `PACK` work type and order statuses `PACKING`, `PACKED`, and `READY_TO_SHIP`.
- Added `PackingService`, `/api/packing`, and Russian `Упаковка` page.
- Picked orders can create packing work.
- Packing verifies product scan and quantity without changing stock.
- Completed packing marks the order as `PACKED`; a separate action marks it `READY_TO_SHIP`.
- DB smoke now covers pick → replenish → pack → ready-to-ship with unchanged stock reconciliation.
- Validation passed: prisma generate, migration/status check, prisma seed, typecheck, lint, tests, DB smoke, build.
- Remaining packing/shipping hardening: package/carton records, labels, carrier integration, idempotency, route/browser tests.

### Phase O Completed: Canonical Permission-Based RBAC

- Added a canonical standalone WMS permission model: organization management, user management, WMS view, warehouse/location management, product/barcode management, receiving, put-away, transfers, adjustments, cycle count execution/approval, picking creation/execution, packing, reports, and audit.
- Preserved legacy `WMS_*` permission names as aliases only, so existing checks remain restrictive during migration.
- Updated WMS services to enforce operation-specific permissions server-side.
- Added role-aware navigation and a Russian access-denied route/boundary for direct unauthorized page access.
- Added permission matrix and organization isolation guard tests.
- Validation passed: typecheck, lint, tests, DB smoke, build.
- Remaining RBAC hardening: API route-handler authorization coverage and browser/mobile E2E tests for role-specific flows.

## Production Operations Notes

Minimum local run:

1. Copy `.env.example` to `.env`.
2. Start database with `pnpm db:up`.
3. Run migrations with `pnpm prisma:migrate`.
4. Set `SEED_ADMIN_PASSWORD` in `.env`, then seed demo data with `pnpm prisma:seed`.
5. Start app with `pnpm dev`.
6. Check runtime health at `/api/health`.

Production reminders:

- Set `DATABASE_URL` to managed PostgreSQL.
- Do not set `ALLOW_DEV_AUTH_FALLBACK=true` in production unless intentionally running a protected internal demo.
- Apply migrations with `pnpm prisma:migrate:deploy` or an equivalent controlled deploy command.
- Back up PostgreSQL before migrations.
- Upgrade Next.js deliberately before public production rollout; the current dependency line is MVP-grade.
- Add rate limiting, password reset/account recovery, invite emails, and optional SSO/2FA before public multi-tenant rollout.
- Add monitoring around `/api/health`, API error rates, migration status, and database backups.

## Acceptance Criteria

For every implemented phase:

- expected behavior works through UI and API where applicable;
- WMS UI copy is Russian;
- no raw enum labels on worker screens;
- tenant isolation is enforced;
- permissions are enforced;
- stock mutation only happens through `StockMovementService`;
- stock changes are transactional;
- movement history is append-only;
- negative stock is blocked unless explicit admin correction allows it;
- critical edge cases are tested;
- typecheck, lint, tests, and build pass or unrelated failures are documented.

## Blueprint Self-Review

- Based on real WMS patterns: yes. The model uses warehouses, bins, zones, tasks/work lines, mobile/scanner workflows, receiving, put-away, transfers, counts, picking, and ledger history.
- Realistic for standalone MVP: yes. Advanced directives, waves, packing, shipping, 3PL, and route optimization are excluded.
- Simple for Russian-speaking non-technical users: mostly yes. Worker flows are scanner-first with short Russian prompts, but browser/e2e validation is still needed.
- Stock rules safe: application-level rules are strong, with DB-level immutability still a hardening task.
- Avoids previous mistake: yes. The document no longer frames the WMS as an integration target or module inside another product.
- Autonomous phases executable: yes. Each phase is small enough to validate independently and can be split further if needed.
