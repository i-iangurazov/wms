# Standalone WMS Production Blueprint

Status legend:

- `IMPLEMENTED`: exists in code and has meaningful validation.
- `PARTIAL`: exists, but is shallow, missing edge cases, or lacks route/E2E coverage.
- `GAP`: not implemented or only represented by a placeholder/status.

This document is the implementation control document for the standalone WMS in this repository. It is not a product diary. Every roadmap item must map back to a blueprint section and an acceptance gate.

Competitive control source: `docs/wms-competitive-blueprint.md`. Navigation and workflow grouping must follow that benchmark before adding new screens.

## 1. Executive Summary

### What This WMS Is

This repository is a standalone warehouse management system for small and medium retail, e-commerce, and store-warehouse operations. It tracks where goods are stored, how stock moves, who performed each operation, and whether operational tasks such as receiving, put-away, replenishment, picking, packing, and cycle counts are complete.

### Target Users

- `Owner`: accountable for organizations, users, inventory accuracy, reports, and audit.
- `Admin`: configures users and warehouse operations.
- `Warehouse Manager`: manages warehouse structure, products, barcodes, operational exceptions, reports, and approvals.
- `Warehouse Worker`: executes scanner-friendly operational work.
- `Viewer`: reads stock, reports, and audit where permitted.

### Business Problems Solved

- Workers need simple guided flows instead of spreadsheets or free-form stock edits.
- Managers need reliable stock by warehouse, zone, location, product, and variant.
- The business needs append-only movement history and auditability.
- Stock-changing operations must be transactional and idempotent enough for mobile/scanner double-submit risk.
- Multi-organization data must remain isolated.

### MVP Scope

MVP means these flows must be usable end to end through UI and API:

- email/password login and organization context;
- role-based permissions;
- warehouse, zone, and location setup;
- product and variant setup, CSV import, and barcode registry;
- stock balances by location;
- append-only movement ledger;
- receiving expected goods, damaged goods, and short/over receipt handling;
- put-away work generation and execution;
- internal transfers;
- stock adjustments with reasons and permission checks;
- cycle count with approval/rejection;
- replenishment rules and executable replenishment work;
- customer order creation, picking, packing, and shipping handoff foundation;
- reconciliation between movement ledger and balances;
- Russian-first UI and access-denied states.

### Explicitly Not MVP

- wave picking;
- batch picking;
- route optimization;
- robotics;
- EDI;
- carrier automation;
- cartonization beyond a future packing-session foundation;
- dock scheduling;
- yard management;
- labor analytics;
- 3PL multi-client logic;
- full ERP purchasing, supplier billing, or purchase order automation;
- SSO/2FA/password reset email unless added in a later production gate.

## 2. Product Principles

- Russian-first UX: every user-facing WMS label, button, empty state, status, and error must be Russian.
- Worker-first scanner flows: operational screens use one primary scan/action at a time.
- Simple UI, strong backend rules: UI hides unavailable actions, but services enforce all permissions, tenant isolation, validations, stock rules, and transactions.
- No raw enum labels in UI: enum values must be translated through `src/lib/wmsText.ts` or a module-specific label map.
- Every warehouse action must be guided, validated, and auditable.
- No direct stock mutation outside `StockMovementService`.
- Movement history is append-only. Corrections create new movements.
- Organization isolation is mandatory in every query and mutation.
- Mobile/scanner flows must handle duplicate submit, wrong barcode, insufficient quantity, and permission denial.

## 3. Reference Systems Alignment

| Reference system | Relevant concept | Why it matters | How we implement it | Current status | Gap | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| Microsoft Dynamics 365 Warehouse Management | Work templates | Turns warehouse actions into repeatable work headers and lines. | `WarehouseWorkTemplate`, `WarehouseWork`, `WarehouseWorkLine`, settings UI. | PARTIAL | Templates are simple records; no conditional template engine. | Manager can configure simple work types; generated work uses header/line model; workers do not see template complexity. |
| Microsoft Dynamics 365 Warehouse Management | Location directives | Directs receiving, put-away, picking, damaged, replenishment source/destination. | `WarehouseLocationDirective`, default receiving lookup, pick priority, partial put-away suggestions. | PARTIAL | No full rule conflict diagnostics or capacity-aware routing. | Rules choose default receiving, preferred put-away zone, pick location priority, damaged location, replenishment zones. |
| Microsoft Dynamics 365 Warehouse Management | Mobile warehouse work | Workers complete line-by-line scan tasks. | Russian pages for receiving, put-away, replenishment, transfers, picking, packing. | PARTIAL | No browser/mobile E2E coverage; generated put-away lacks strict scan confirmation. | E2E proves worker can complete operational flows on mobile viewport with scan-like keyboard input. |
| Oracle WMS Cloud | Receiving and put-away | Expected vs actual receipt and directed movement from receiving to storage/picking. | `ReceivingSession`, `ReceivingLine`, damaged/short/over fields, `PUTAWAY` work. | PARTIAL | Unknown barcode exception and supplier reference model are missing. | Exact, short, over, damaged, and unexpected receipt scenarios are tested and audited. |
| Oracle WMS Cloud | Replenishment | Maintains pick faces from bulk/storage. | `ReplenishmentRule`, `REPLENISHMENT` work, source/destination scans. | PARTIAL | No scheduled generation, priority queue, or shortage exception queue. | Low pick stock generates replenishment work; source shortage is explicit and tested. |
| Oracle WMS Cloud | Tasking and barcode workflows | Barcode scans must resolve to typed entities and prevent ambiguity. | `BarcodeService`, `BarcodeLabel`, scan normalization, Russian scan errors. | PARTIAL | No ambiguity resolver UI; no label templates. | Ambiguous scans are rejected with Russian recovery guidance; labels can be exported/printed. |
| NetSuite WMS | Inventory tracking by bin/location | Stock must be visible by bin and product. | `InventoryLocationBalance` with location/product/variant uniqueness. | IMPLEMENTED | Reservation/allocation is not modeled as a first-class object. | Stock page shows on-hand/available/unavailable by warehouse/location/product; tests cover balance math. |
| NetSuite WMS | Pick-pack-ship | Pick and pack are separate operational states. | `PICK` and `PACK` warehouse work; order status reaches `READY_TO_SHIP`. | PARTIAL | No `PackingSession` or `Shipment` model; no package contents. | Picked items are verified in packing, packing mistakes are recorded, handoff state is auditable. |
| NetSuite WMS | Handheld barcode scanning | Scanner input should drive worker screens. | `ScanField`, scanner text, idempotency keys on high-risk flows. | PARTIAL | No Playwright scanner tests. | E2E covers wrong product, wrong location, duplicate submit, and mobile layout. |
| Odoo Inventory/Barcode | SMB locations and routes | SMB WMS needs simple zones, bins, routes, and adjustments. | Warehouses, zones, locations, directives, transfers, adjustments, replenishment. | PARTIAL | Settings can still feel admin-heavy; not every route has API tests. | Worker UI stays simple; manager UI supports required configuration without enterprise terminology. |
| Odoo Inventory/Barcode | Inventory adjustments | Corrections need reason, note, and permission. | `AdjustmentService`, adjustment reasons, manual note requirement. | IMPLEMENTED | Damaged/blocked state UI needs more explanation and tests for all state deltas. | Unauthorized roles cannot adjust; manual correction requires note; negative stock is blocked except explicit admin correction. |
| SAP EWM-style | Warehouse tasks and storage bins | Physical work is modeled as tasks/lines over bins. | `WarehouseWork`, `WarehouseWorkLine`, `WarehouseLocation`. | PARTIAL | No reservation-driven allocation task generation yet. | Work is generated from operational demand and completed with scan validation. |
| SAP EWM-style | Physical inventory | Cycle count snapshots and approvals protect stock. | `CycleCountSession`, `CycleCountLine`, approval creates correction movement. | PARTIAL | Blind counts, recount history, unexpected item flow missing. | Count does not mutate stock before approval; rejection/recount history is auditable. |

## 4. Domain Model Blueprint

### Organization / Store

- Business meaning: tenant/company context for all WMS data.
- Database model: `Store`.
- Relationships: users, products, warehouses, locations, balances, movements, receiving, work, counts, orders, audit, sessions, labels.
- Lifecycle statuses: `active` boolean.
- Invariants: every operational record must include `storeId`; cross-store access is rejected by context checks.
- Permissions: `org.manage` for creating organizations; `users.manage` for user membership; read depends on current session membership.
- Audit requirements: organization creation and user access changes.
- Test requirements: cross-organization access tests, session switch membership tests.
- Current status: PARTIAL. Store isolation exists; route-level cross-tenant tests are incomplete.

### User

- Business meaning: person using the WMS.
- Database model: `User`.
- Relationships: `StoreUser`, sessions, login attempts, audit logs, created movements/work/counts/labels.
- Lifecycle statuses: `active`.
- Invariants: email unique; inactive users cannot authenticate.
- Permissions: user actions require `users.manage`; organization creation requires `org.manage`.
- Audit requirements: user add, role change, remove access.
- Test requirements: login, rate limit, role changes, protected routes, forbidden actions.
- Current status: PARTIAL. Password login and sessions exist; reset/invite/2FA are gaps.

### Role

- Business meaning: coarse job responsibility mapped to permissions.
- Database model: Prisma enum `Role` plus permission matrix in `src/lib/permissionModel.ts`.
- Relationships: `StoreUser.role`; `User.role` legacy/default.
- Lifecycle statuses: not versioned.
- Invariants: services check permissions, not role names.
- Permissions: role changes require `users.manage`; owner-only organization operations require `org.manage`.
- Audit requirements: role changes.
- Test requirements: permission matrix, route matrix, forbidden service calls.
- Current status: IMPLEMENTED for MVP RBAC; route handler coverage remains PARTIAL.

### Product

- Business meaning: stock keeping item family.
- Database model: `Product`.
- Relationships: variants, balances, movements, receiving lines, work lines, count lines, order lines, labels, replenishment rules.
- Lifecycle statuses: `active`.
- Invariants: `sku` unique per store; barcode unique per store when present; cannot deactivate with stock or open work.
- Permissions: `products.manage` for mutations; `wms.view` for listing.
- Audit requirements: create/update/deactivate/import.
- Test requirements: SKU/barcode validation, deactivation blockers, import rows.
- Current status: PARTIAL. CSV import exists; XLSX, preview/commit, and richer conflict reporting are gaps.

### ProductVariant

- Business meaning: sellable or stockable option under a product.
- Database model: `ProductVariant`.
- Relationships: same stock/order/work/count relationships as product.
- Lifecycle statuses: `active`.
- Invariants: variant `sku` unique per store; variant barcode unique per store; `variantKey` normalizes null variant to base product.
- Permissions: `products.manage`.
- Audit requirements: create/update/deactivate.
- Test requirements: variant ownership and deactivation with stock/open work.
- Current status: PARTIAL.

### BarcodeLabel

- Business meaning: additional scannable alias for product, variant, location, order, or work.
- Database model: `BarcodeLabel`.
- Relationships: optional product, variant, location, order, work.
- Lifecycle statuses: `active`.
- Invariants: label `code` unique per store; conflicts with native SKU/barcode/location/order/work identifiers are rejected.
- Permissions: `barcodes.manage`; location labels require `wms.manageLocations` in current service.
- Audit requirements: label creation and future deactivate/edit.
- Test requirements: conflict, ambiguity, export, cross-tenant isolation.
- Current status: PARTIAL. Registry/export exists; edit/deactivate, print templates, and ambiguity resolver UI are gaps.

### Warehouse

- Business meaning: physical warehouse or store stock room.
- Database model: `Warehouse`.
- Relationships: zones, locations, templates, directives, replenishment rules, balances, movements, receiving, work, counts.
- Lifecycle statuses: `ACTIVE`, `INACTIVE`.
- Invariants: `code` unique per store; cannot deactivate with active locations, stock, or open work.
- Permissions: `wms.manageWarehouses`.
- Audit requirements: create/update/deactivate.
- Test requirements: uniqueness, deactivation blockers, cross-tenant access.
- Current status: IMPLEMENTED for MVP CRUD; route tests remain PARTIAL.

### WarehouseZone

- Business meaning: simple grouping of locations inside a warehouse.
- Database model: `WarehouseZone`.
- Relationships: warehouse, locations, directives, replenishment rules.
- Lifecycle statuses: `ACTIVE`, `INACTIVE`.
- Invariants: `code` unique per warehouse; cannot deactivate with active locations.
- Permissions: `wms.manageLocations`.
- Audit requirements: create/update/deactivate.
- Test requirements: zone ownership, directive usage, deactivation blocker.
- Current status: PARTIAL.

### WarehouseLocation

- Business meaning: physical bin/cell where goods may be received, stored, picked, packed, shipped, returned, or damaged.
- Database model: `WarehouseLocation`.
- Relationships: warehouse, zone, balances, movements, receiving sessions, work lines, cycle counts, barcode labels.
- Lifecycle statuses: `ACTIVE`, `INACTIVE`.
- Invariants: `code` unique per warehouse; `barcode` unique per store; active status required for operations; flags define worker usage.
- Permissions: `wms.manageLocations`.
- Audit requirements: create/update/deactivate.
- Test requirements: barcode uniqueness, type/flag validation, deactivation blockers.
- Current status: IMPLEMENTED for basic use; capacity model is GAP.

### InventoryLocationBalance

- Business meaning: current physical and unavailable stock state by location/product/variant.
- Database model: `InventoryLocationBalance`.
- Relationships: store, warehouse, location, product, variant.
- Lifecycle statuses: none.
- Invariants: unique by `storeId/locationId/productId/variantKey`; changed only by `StockMovementService`; no negative state unless explicit allowed correction.
- Permissions: read requires `wms.view`; mutation is indirect through operation permissions.
- Audit requirements: not directly audited; every mutation creates `InventoryMovement` and audit log.
- Test requirements: stock increase, transfer, negative prevention, reserved/picked/damaged/blocked math, reconciliation.
- Current status: PARTIAL. Fields exist, but reservation allocation is GAP.

### InventoryMovement

- Business meaning: append-only stock ledger.
- Database model: `InventoryMovement`.
- Relationships: store, warehouse, from/to location, product, variant, createdBy, optional stock command.
- Lifecycle statuses: append-only only.
- Invariants: no public update/delete; every stock mutation creates movement in same transaction; signed deltas support reconciliation.
- Permissions: list requires `wms.view`; creation is internal via `StockMovementService`.
- Audit requirements: `inventory_movement.create`.
- Test requirements: append-only boundaries, deltas, reconciliation, idempotency.
- Current status: IMPLEMENTED for current movement types; reservation/release movement types are GAP.

### ReceivingSession

- Business meaning: receiving header for inbound goods.
- Database model: `ReceivingSession`.
- Relationships: warehouse, receiving location, creator, lines.
- Lifecycle statuses: `DRAFT`, `RECEIVING`, `COMPLETED`, `CANCELLED`.
- Invariants: receiving location must be active and receivable; completed sessions cannot receive more.
- Permissions: `receiving.execute`.
- Audit requirements: create, complete.
- Test requirements: create, receive, complete, duplicate submit, cross-tenant, short/over policies.
- Current status: PARTIAL. Supplier and unknown barcode flows are gaps.

### ReceivingLine

- Business meaning: expected and actual received quantity for a product/variant.
- Database model: `ReceivingLine`.
- Relationships: session, product, variant, put-away work lines.
- Lifecycle statuses: `OPEN`, `RECEIVED`, `CLOSED_SHORT`, `OVER_RECEIVED`, `CANCELLED`.
- Invariants: quantities non-negative; damaged and short quantities are explicit; receive creates movements through stock service.
- Permissions: `receiving.execute`; over-receipt currently requires `adjustments.create`.
- Audit requirements: line create, receive, short close.
- Test requirements: exact, over, under, damaged, completed-session rejection, idempotency.
- Current status: PARTIAL.

### WarehouseWork

- Business meaning: executable work header.
- Database model: `WarehouseWork`.
- Relationships: warehouse, source order, replenishment rule, creator, assignee, work lines, labels.
- Lifecycle statuses: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Invariants: work header status follows line statuses.
- Permissions: depends on type: put-away, replenishment, picking, packing.
- Audit requirements: work creation and completion-relevant line actions.
- Test requirements: header status transitions, type-specific permissions, cross-tenant.
- Current status: PARTIAL. Allocation-driven work generation is GAP.

### WarehouseWorkLine

- Business meaning: one executable worker step or stock movement requirement.
- Database model: `WarehouseWorkLine`.
- Relationships: work, optional receiving line, source location, destination location, product, variant.
- Lifecycle statuses: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Invariants: source location required; destination required for movement tasks; scans must match; completed lines cannot be repeated.
- Permissions: inherited from work type.
- Audit requirements: line execution events.
- Test requirements: wrong scan, insufficient quantity, duplicate submit, partial completion.
- Current status: PARTIAL.

### Reservation

- Business meaning: allocation of order demand to physical location stock before picking.
- Database model: `InventoryReservation`.
- Relationships: store, order line, product, variant, warehouse, location, quantity, status, createdBy.
- Lifecycle statuses: `RESERVED`, `RELEASED`, `PICKING`, `PICKED`, `SHORT`, `CANCELLED`.
- Invariants: reservedQty must equal open reservation quantities; one order line can split across bins; cannot reserve more than available.
- Permissions: `picking.create` for allocation, `picking.execute` for execution/release in operational flows.
- Audit requirements: reserve, release, short, pick transition.
- Test requirements: split-bin allocation, double allocation prevention, release on cancel, cross-tenant.
- Current status: PARTIAL. Schema exists; reservation service, stock-state mutation, allocation UI/API, and tests are still GAP.

### ReplenishmentRule

- Business meaning: min/max rule that keeps pick locations stocked.
- Database model: `ReplenishmentRule`.
- Relationships: warehouse, product, variant, pick location, optional source location/zone, work.
- Lifecycle statuses: `active`.
- Invariants: max > min; pick location must be pickable; source and destination differ.
- Permissions: create/update requires `wms.manageLocations`; execute requires `putaway.execute`.
- Audit requirements: rule create/deactivate, work create, line complete.
- Test requirements: low-stock generation, insufficient source, duplicate open work prevention.
- Current status: PARTIAL.

### CycleCountSession

- Business meaning: physical inventory count header for a warehouse/location.
- Database model: `CycleCountSession`.
- Relationships: warehouse, location, creator, approver, lines.
- Lifecycle statuses: `DRAFT`, `COUNTING`, `PENDING_APPROVAL`, `APPROVED`, `CANCELLED`.
- Invariants: no stock mutation before approval; approval only once.
- Permissions: `cycleCounts.execute`, `cycleCounts.approve`.
- Audit requirements: create, count line, submit, approve, reject.
- Test requirements: snapshot, no pre-approval mutation, approval variance, rejection.
- Current status: PARTIAL. Blind count, recount history, unexpected item flow are gaps.

### CycleCountLine

- Business meaning: counted product/variant snapshot and difference.
- Database model: `CycleCountLine`.
- Relationships: session, product, variant.
- Lifecycle statuses: inherited from session; counted when `countedQty` is set.
- Invariants: expected snapshot immutable; counted quantity non-negative; difference = counted - expected.
- Permissions: count execute/approve through session.
- Audit requirements: count updates and approval corrections.
- Test requirements: missing item, unexpected item, recount, approval correction.
- Current status: PARTIAL.

### CustomerOrder

- Business meaning: order demand that can create pick/pack work.
- Database model: `CustomerOrder`.
- Relationships: lines, work, labels.
- Lifecycle statuses: `OPEN`, `ALLOCATED`, `PICKING`, `PICKED`, `PACKING`, `PACKED`, `READY_TO_SHIP`, `CANCELLED`.
- Invariants: order number unique per store; status must match allocation/pick/pack state.
- Permissions: create/list currently under picking permissions.
- Audit requirements: create, pick work, pack work, handoff.
- Test requirements: multi-line orders, split-bin allocation, cancel release.
- Current status: PARTIAL. No reservation model yet.

### CustomerOrderLine

- Business meaning: product demand line.
- Database model: `CustomerOrderLine`.
- Relationships: order, product, variant.
- Lifecycle statuses: inherited from order.
- Invariants: positive quantity; cannot allocate/pick more than quantity.
- Permissions: inherited from order.
- Audit requirements: order creation and future line changes.
- Test requirements: multi-line, split allocation, partial pick.
- Current status: PARTIAL.

### PackingSession

- Business meaning: verification session after picking and before shipping handoff.
- Database model: GAP. Current packing uses `WarehouseWork` type `PACK`.
- Relationships: order, packed lines, user, timestamps, exceptions.
- Lifecycle statuses: needed `OPEN`, `IN_PROGRESS`, `PACKED`, `EXCEPTION`, `CANCELLED`.
- Invariants: cannot pack before pick complete; packed quantities cannot exceed picked quantities.
- Permissions: `packing.execute`.
- Audit requirements: session create, line verify, exception, complete.
- Test requirements: wrong product, quantity mismatch, duplicate pack, partial pack.
- Current status: GAP/PARTIAL. Packing service exists without session model.

### Shipment / ShippingHandoff

- Business meaning: final handoff from warehouse to outbound shipping process.
- Database model: GAP. Current handoff is `CustomerOrder.status = READY_TO_SHIP`.
- Relationships: order, packing session, handoff user, timestamp.
- Lifecycle statuses: needed `READY_TO_SHIP`, future `HANDED_OFF`, `CANCELLED`.
- Invariants: cannot hand off before packed.
- Permissions: `packing.execute` or future shipping permission.
- Audit requirements: handoff event.
- Test requirements: cannot handoff unpacked; handoff is auditable.
- Current status: PARTIAL.

## 5. Stock and Ledger Rules

### Quantity Fields

- `onHandQty`: physical quantity in the location.
- `reservedQty`: allocated to demand, still physically in the location.
- `pickedQty`: physically picked from source but not fully shipped; current implementation has field but no full picked-stock policy.
- `damagedQty`: physical stock marked damaged/unavailable.
- `blockedQty`: physical stock quarantined or blocked.
- `availableQty = onHandQty - reservedQty - pickedQty - damagedQty - blockedQty`.

### Field Changes

| Operation | onHandQty | reservedQty | pickedQty | damagedQty | blockedQty | Movement |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Receive good stock | destination +qty | unchanged | unchanged | unchanged | unchanged | `RECEIVE` |
| Receive damaged stock | destination +qty | unchanged | unchanged | destination +qty | unchanged | `RECEIVE` plus `ADJUSTMENT` damaged state |
| Put-away | source -qty, destination +qty | unchanged | unchanged | unchanged | unchanged | `PUTAWAY` |
| Transfer | source -qty, destination +qty | unchanged | unchanged | unchanged | unchanged | `TRANSFER` |
| Adjustment found/lost/manual | target +/-qty or state delta | depends on target state | depends | depends | depends | `ADJUSTMENT` |
| Cycle count approval | target +/-variance | unchanged | unchanged | unchanged | unchanged | `CYCLE_COUNT_CORRECTION` |
| Reservation allocation | unchanged | source +qty | unchanged | unchanged | unchanged | GAP: needs reservation movement or audited stock command |
| Reservation release | unchanged | source -qty | unchanged | unchanged | unchanged | GAP |
| Picking | source -qty today | GAP policy | GAP policy | unchanged | unchanged | `PICK` today; should transition from reserved to picked |
| Packing | unchanged | unchanged | unchanged | unchanged | unchanged | no stock movement |
| Shipping handoff | unchanged today | GAP policy | GAP policy | unchanged | unchanged | no carrier/shipment movement yet |

### Mutation Service

- Only `StockMovementService` may mutate `InventoryLocationBalance`.
- Service methods must run in Prisma transactions.
- Services that represent workflows may change workflow state inside the same transaction after stock movement succeeds.
- Route handlers and UI components must never update balances directly.

### Movements and Audit

- Every stock mutation creates exactly one or more append-only `InventoryMovement` rows.
- Every movement gets an `inventory_movement.create` audit entry.
- Workflow events also create business audit entries.
- No public update/delete API exists for movements.

### Negative Stock Policy

- Default: block negative `onHandQty` and negative available stock.
- Exception: explicit admin/manager correction path may allow negative only with permission, reason, and note.
- Worker operations cannot create negative stock.

### Idempotency Policy

- `StockCommand` stores `idempotencyKey`, operation, fingerprint, movement link.
- Receive and pick also use workflow-level idempotency before line state changes.
- Duplicate same-payload commands replay safely.
- Same key with different payload is rejected.
- Gaps: replenishment and packing need whole-command idempotency.

### Reconciliation Policy

- `InventoryMovement` stores signed deltas.
- `ReconciliationService` compares ledger-derived quantities to `InventoryLocationBalance`.
- Current status: PARTIAL. Manual page exists; scheduled reconciliation and alerting are gaps.

## 6. Role-Based Access Blueprint

Canonical permissions are defined in `src/lib/permissionModel.ts`.

| Area | Owner | Admin | Warehouse Manager | Warehouse Worker | Viewer |
| --- | --- | --- | --- | --- | --- |
| Users | manage | manage | no | no | no |
| Organizations | manage | no destructive ownership ops | no | no | no |
| Warehouses | manage | manage | manage | no | view only through WMS data | view |
| Zones | manage | manage | manage | no | view |
| Locations | manage | manage | manage | no | view |
| Products | manage | manage | manage | no | view |
| Barcodes | manage | manage | manage | no | view |
| Receiving | execute/manage | execute/manage | execute/manage | execute | view only |
| Put-away | execute/manage | execute/manage | execute/manage | execute | view only |
| Transfers | execute | execute | execute | execute | view only |
| Adjustments | create | create | create | no | no |
| Cycle counts | execute/approve | execute/approve | execute/approve | execute only | view only |
| Approvals | yes | yes | yes | no | no |
| Picking | create/execute | create/execute | create/execute | execute only | view only |
| Packing | execute | execute | execute | execute | view only |
| Reports | view | view | view | no unless granted later | view |
| Audit logs | view | view | view | no | view |
| Settings | manage | manage users/rules | manage rules, not users | no | no |

### Server-Side Enforcement

- Services call `requirePermission`.
- Route handlers obtain `RequestContext` from session and call services.
- UI route boundaries and navigation are convenience only; they are not security controls.
- Cross-organization checks rely on session `storeId` and store membership.

### UI Hiding and Disabled Actions

- Navigation uses `visibleWmsNavItems`.
- Direct unauthorized WMS page access renders `AccessDenied`.
- Manager-only form panels are hidden when missing permission.

### Russian Access Denied Copy

- Title: `Недостаточно прав`.
- Main message: `У вас нет доступа к этому действию`.
- Help text: `Обратитесь к администратору`.

### Tests Required

- Permission matrix unit tests: IMPLEMENTED.
- Route access matrix tests: IMPLEMENTED.
- Cross-organization guard tests: IMPLEMENTED.
- API route permission tests: GAP.
- Browser/E2E forbidden UI tests: GAP.

## 7. Information Architecture

Primary navigation must be workflow-first and match `docs/wms-navigation-redesign.md`.

| Section | Target user | Purpose | Primary actions | Hidden complexity | Required states |
| --- | --- | --- | --- | --- | --- |
| `Обзор` | Owner, manager | Operational snapshot | View tasks, discrepancies, recent movement | Aggregation and filters | empty, loading, error |
| `Задачи` | Worker, manager | Daily warehouse task center | Start receive, put-away, transfer, count, pick, pack, replenishment | work type routing and exceptions | empty, loading, forbidden |
| `Товары и остатки` | Admin, manager, viewer | Catalog and stock visibility | Search stock, import products, manage barcodes, corrections | SKU/variant/barcode internals | import errors, no results, error |
| `Приёмка` | Worker, manager | Receive inbound goods | Create session, scan product, receive qty | expected vs actual, damage, idempotency | wrong scan, duplicate submit, completed |
| `Сборка и упаковка` | Worker, manager | Fulfillment | allocate, pick, short-pick, pack, handoff | reservation and package state | wrong scan, short pick, already packed |
| `Инвентаризация` | Worker, manager | Count and approve stock | create count, enter counts, submit, approve/reject | blind count, recount | missing count, discrepancy |
| `Пополнение` | Worker, manager | Refill pick locations | create rule, generate/execute work | min/max, source priority | no need, no source stock |
| `Склады` | Admin, manager | Configure warehouses, zones, bins | Create/edit/deactivate | location directives, type flags | empty, validation error, forbidden |
| `Журнал` | Owner, admin, manager, viewer | Movements, audit, reconciliation | review history, discrepancies, audit | raw metadata and ledger deltas | empty, loading, error |
| `Настройки` | Owner, admin, manager | Users, org switch, rules | manage users, orgs, rules | role matrix, session rotation | forbidden, validation error |

## 8. Operational Workflow Blueprints

Each workflow must be implemented through UI and API, tenant-scoped, permission-checked, auditable, and tested.

### Product Import

- Goal: create product catalog from CSV.
- Actor: manager/admin.
- Starting state: organization exists; user has `products.manage`.
- Happy path: upload CSV, validate rows, create products/variants and extra labels.
- Failure paths: duplicate SKU/barcode, malformed rows, unknown columns.
- Validations: required SKU/name, unique store-scoped SKU/barcode.
- Stock changes: none.
- Ledger movements: none.
- Audit events: `product.import_csv`, product/variant/label creation as needed.
- Idempotency: GAP. Re-upload can conflict; preview/update mode needed.
- UI states: upload, row errors, success count.
- Tests: parser unit tests IMPLEMENTED; route/DB import tests PARTIAL.
- Status: PARTIAL.

### Barcode Label Creation

- Goal: register additional scan codes.
- Actor: manager/admin.
- Starting state: target product/location/order/work exists.
- Happy path: select type, target, code, create label, export CSV.
- Failure paths: conflict, ambiguity, missing target.
- Validations: code normalized; unique per store.
- Stock changes: none.
- Ledger movements: none.
- Audit events: `barcode_label.create`.
- Idempotency: not required for simple create; duplicate creates reject.
- UI states: empty registry, conflict error, export.
- Tests: unit tests IMPLEMENTED; route tests GAP.
- Status: PARTIAL.

### Warehouse/Location Setup

- Goal: create physical structure.
- Actor: admin/manager.
- Starting state: organization exists.
- Happy path: create warehouse, zones, locations, rules.
- Failure paths: duplicate code/barcode, deactivate with stock/open work.
- Validations: active warehouse, valid type, location flags.
- Stock changes: none.
- Ledger movements: none.
- Audit events: warehouse, zone, location, rule changes.
- Idempotency: not required.
- UI states: empty warehouse/location list, validation errors, forbidden.
- Tests: service smoke PARTIAL; route tests GAP.
- Status: PARTIAL.

### Receiving Expected Goods

- Goal: receive known product quantities.
- Actor: worker/manager.
- Starting state: active warehouse, receiving location, session and lines.
- Happy path: scan/select product, enter received qty, confirm, complete.
- Failure paths: completed session, invalid location, product not found.
- Validations: non-negative expected/received; positive receive qty.
- Stock changes: receiving location on-hand increases.
- Ledger movements: `RECEIVE`.
- Audit events: session/line create, receive, movement, complete.
- Idempotency: IMPLEMENTED for receive command.
- UI states: no sessions, scan product, quantity error, duplicate submit.
- Tests: rules and DB smoke PARTIAL; route tests GAP.
- Status: PARTIAL.

### Receiving Unexpected Goods

- Goal: handle scanned item not on expected receipt.
- Actor: worker with manager review.
- Starting state: receiving session open.
- Happy path: scan unknown item, create exception line or park for review.
- Failure paths: barcode not found, ambiguous scan, product not authorized.
- Validations: product belongs to organization; exception reason required.
- Stock changes: should receive to receiving only after confirmation.
- Ledger movements: `RECEIVE` if accepted.
- Audit events: exception create, accepted/rejected.
- Idempotency: needed.
- UI states: unknown barcode prompt, create/hold/reject options.
- Tests: GAP.
- Status: GAP.

### Receiving Damaged Goods

- Goal: receive damaged units and mark unavailable.
- Actor: worker/manager.
- Starting state: receiving session open.
- Happy path: enter good and damaged qty; damaged stock becomes unavailable.
- Failure paths: negative qty, over receipt without permission.
- Validations: damaged qty non-negative; over policy enforced.
- Stock changes: on-hand increases; damagedQty increases.
- Ledger movements: `RECEIVE` and `ADJUSTMENT`.
- Audit events: receive, movement.
- Idempotency: implemented with receive command.
- UI states: damaged qty field, over warning.
- Tests: rules and smoke PARTIAL; route tests GAP.
- Status: PARTIAL.

### Putaway Full

- Goal: move all received stock to suggested destination.
- Actor: worker.
- Starting state: received stock in receiving; put-away work generated.
- Happy path: generate work, scan/confirm line, move full qty.
- Failure paths: no destination, insufficient receiving balance, inactive destination.
- Validations: source/destination active, destination storage/picking-compatible.
- Stock changes: source on-hand decreases, destination on-hand increases.
- Ledger movements: `PUTAWAY`.
- Audit events: work create, line complete, movement.
- Idempotency: stock movement supports key; whole generated work confirmation needs stronger coverage.
- UI states: no work, suggested destination, quantity error.
- Tests: DB smoke PARTIAL; route tests GAP.
- Status: PARTIAL.

### Putaway Partial

- Goal: move received stock over multiple confirmations.
- Actor: worker.
- Starting state: put-away line open.
- Happy path: confirm less than remaining, line stays in progress.
- Failure paths: exceed remaining, duplicate submit.
- Validations: quantity <= remaining and available receiving stock.
- Stock changes: partial movement.
- Ledger movements: `PUTAWAY`.
- Audit events: each line execution.
- Idempotency: PARTIAL.
- UI states: remaining qty visible.
- Tests: PARTIAL.
- Status: PARTIAL.

### Transfer

- Goal: move stock between locations.
- Actor: worker/manager.
- Starting state: active source/destination, available stock.
- Happy path: scan source, product, destination, qty, confirm.
- Failure paths: same location, wrong scan, insufficient stock.
- Validations: source/destination differ; active locations; available qty.
- Stock changes: source on-hand decreases, destination on-hand increases.
- Ledger movements: `TRANSFER`.
- Audit events: movement.
- Idempotency: stock command supported.
- UI states: source/product/destination/qty steps.
- Tests: unit/smoke PARTIAL; route/E2E GAP.
- Status: PARTIAL.

### Damaged/Blocked Adjustment

- Goal: change stock availability or on-hand with reason.
- Actor: manager/admin.
- Starting state: stock exists or explicit correction allowed.
- Happy path: choose location/product/reason/state/qty/note, confirm.
- Failure paths: worker forbidden, manual correction without note, negative blocked.
- Validations: reason valid; note for manual; negative policy.
- Stock changes: target state delta or on-hand delta.
- Ledger movements: `ADJUSTMENT`.
- Audit events: movement.
- Idempotency: stock command supported.
- UI states: reason labels, permission denied, quantity error.
- Tests: unit/smoke PARTIAL; route tests GAP.
- Status: PARTIAL.

### Cycle Count

- Goal: count physical stock and capture variance.
- Actor: worker/manager.
- Starting state: active warehouse/location.
- Happy path: create session snapshot, enter counted qty, submit.
- Failure paths: negative count, incomplete lines.
- Validations: counted qty non-negative; all lines counted before submit.
- Stock changes: none before approval.
- Ledger movements: none before approval.
- Audit events: create, line counted, submit.
- Idempotency: GAP.
- UI states: count list, missing counts, pending approval.
- Tests: rules/smoke PARTIAL.
- Status: PARTIAL.

### Recount

- Goal: repeat count after manager rejects discrepancy.
- Actor: worker/manager.
- Starting state: count pending approval or rejected.
- Happy path: manager rejects with reason; worker recounts.
- Failure paths: approved session cannot be rejected.
- Validations: rejection reason; preserve history.
- Stock changes: none.
- Ledger movements: none.
- Audit events: reject, recount updates.
- Idempotency: GAP.
- UI states: returned for recount.
- Tests: rejection exists PARTIAL; recount history GAP.
- Status: GAP/PARTIAL.

### Approval/Rejection

- Goal: manager applies or rejects cycle count variance.
- Actor: manager/admin.
- Starting state: session pending approval.
- Happy path: approve; variance movement applies.
- Failure paths: worker forbidden, approval twice, stale session.
- Validations: approval permission; pending status.
- Stock changes: on-hand +/- variance.
- Ledger movements: `CYCLE_COUNT_CORRECTION`.
- Audit events: approve/reject, movement.
- Idempotency: GAP.
- UI states: discrepancy warning, approval result.
- Tests: rules/smoke PARTIAL.
- Status: PARTIAL.

### Reservation/Allocation

- Goal: reserve stock by location before picking.
- Actor: manager/system.
- Starting state: open order, available stock.
- Happy path: allocate order lines across one or more bins; reserve quantities.
- Failure paths: insufficient stock, double allocation, cancel release.
- Validations: no reserve beyond available; same org/product/location.
- Stock changes: reservedQty increases; release decreases.
- Ledger movements: GAP movement or audited command required.
- Audit events: allocate/release.
- Idempotency: required.
- UI states: allocation status and shortage.
- Tests: GAP.
- Status: GAP.

### Picking Full

- Goal: pick all allocated goods.
- Actor: worker.
- Starting state: pick work from allocation.
- Happy path: scan location/product, confirm full qty, line completes.
- Failure paths: wrong location/product, quantity too high.
- Validations: scan matches allocated source; not completed.
- Stock changes: should release reserved and transition to picked/on-hand policy. Current implementation decrements on-hand directly.
- Ledger movements: `PICK`.
- Audit events: line pick, movement.
- Idempotency: implemented for pick line.
- UI states: scan prompts, success, wrong scan.
- Tests: rules/smoke PARTIAL.
- Status: PARTIAL because allocation is missing.

### Picking Partial

- Goal: pick less than required quantity.
- Actor: worker.
- Starting state: pick work line open.
- Happy path: confirm partial qty; line remains in progress/review.
- Failure paths: exceed remaining, repeat completed.
- Validations: positive qty <= remaining.
- Stock changes: partial pick.
- Ledger movements: `PICK`.
- Audit events: line pick with exception/review marker.
- Idempotency: implemented for pick line.
- UI states: remaining qty and review marker.
- Tests: unit PARTIAL.
- Status: PARTIAL.

### Short Pick

- Goal: mark shortage and route for manager resolution.
- Actor: worker then manager.
- Starting state: allocated/pick work cannot be fully picked.
- Happy path: worker reports short; manager resolves release/backorder/cancel.
- Failure paths: short without scan evidence, duplicate resolution.
- Validations: reason required; preserve order line state.
- Stock changes: release reservation and/or adjust picked state.
- Ledger movements: release/adjustment as needed.
- Audit events: short report, resolution.
- Idempotency: required.
- UI states: `Требует проверки`.
- Tests: GAP/PARTIAL. Only exception marker exists.
- Status: PARTIAL.

### Replenishment

- Goal: move stock from storage to pick location when below min.
- Actor: manager/worker.
- Starting state: active rule, low pick location stock, source stock available.
- Happy path: generate work, scan source/destination/product, confirm.
- Failure paths: no source stock, duplicate open work, qty exceeds source.
- Validations: max > min; source != destination; active locations.
- Stock changes: source on-hand decreases, pick location increases.
- Ledger movements: `TRANSFER`.
- Audit events: rule create, work create, line execute.
- Idempotency: confirmation gap.
- UI states: no need, shortage, generated work.
- Tests: smoke PARTIAL.
- Status: PARTIAL.

### Packing

- Goal: verify picked items before shipping handoff.
- Actor: worker.
- Starting state: order picked.
- Happy path: create pack work, scan product/qty, complete pack.
- Failure paths: order not picked, wrong product, qty too high, duplicate pack.
- Validations: completed pick work exists.
- Stock changes: none currently.
- Ledger movements: none.
- Audit events: pack work create, line pack.
- Idempotency: GAP.
- UI states: product verification, packed status.
- Tests: smoke PARTIAL.
- Status: PARTIAL.

### Shipping Handoff

- Goal: mark packed order as ready for outbound process.
- Actor: worker/manager.
- Starting state: order packed.
- Happy path: click handoff, order becomes `READY_TO_SHIP`.
- Failure paths: order not packed, duplicate handoff.
- Validations: status `PACKED`.
- Stock changes: none currently.
- Ledger movements: none.
- Audit events: `customer_order.ready_to_ship`.
- Idempotency: GAP.
- UI states: `Передан в отгрузку`.
- Tests: smoke PARTIAL.
- Status: PARTIAL.

### Reconciliation

- Goal: compare balances against ledger deltas.
- Actor: manager/owner.
- Starting state: movements and balances exist.
- Happy path: no discrepancies.
- Failure paths: discrepancy rows show product/location/state difference.
- Validations: tenant-scoped ledger and balance query.
- Stock changes: none.
- Ledger movements: none.
- Audit events: none currently.
- Idempotency: not applicable.
- UI states: no discrepancies, discrepancy table, error.
- Tests: smoke PARTIAL.
- Status: PARTIAL. Scheduled alerts are GAP.

## 9. API and Service Architecture

| Module | Service | Responsibilities | Public methods | Transaction boundaries | Idempotency | Permission checks | Audit events | Route handlers | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth/session | `session.ts`, `auth.ts` | login, logout, session context, org switch | authenticate, create/destroy/get/rotate session | session writes | not command-level | middleware/session membership | login attempts | `/api/auth/*`, `/api/context` | unit PARTIAL | PARTIAL |
| Permissions | `permissions.ts`, `permissionModel.ts` | role-permission matrix | `hasPermission`, `requirePermission` | none | n/a | n/a | user changes elsewhere | route boundary | unit IMPLEMENTED | IMPLEMENTED |
| Warehouse | `WarehouseService` | warehouse CRUD/status | list, get, create, update | create/update tx | n/a | `wms.view`, `wms.manageWarehouses` | create/update | `/api/warehouses` | smoke PARTIAL | PARTIAL |
| Location | `LocationService` | zones/locations CRUD | list/create/update/deactivate | mutations tx | n/a | `wms.manageLocations` | create/update | `/api/warehouse-locations`, `/api/warehouse-zones` | smoke PARTIAL | PARTIAL |
| Rules | `WarehouseRuleService` | templates/directives | list/create/delete | mutations tx | n/a | `wms.manageLocations` | create/deactivate | `/api/warehouse-rules` | smoke PARTIAL | PARTIAL |
| Products | `ProductService` | products/variants | list/create/update/deactivate | mutations tx | n/a | `products.manage` | product events | `/api/products` | unit/smoke PARTIAL | PARTIAL |
| Import | `ProductImportService` | CSV import | parse/import | import tx | GAP | `products.manage` | import | `/api/products/import` | unit PARTIAL | PARTIAL |
| Barcode | `BarcodeService`, `BarcodeLabelService` | scan resolution, label registry | resolve, list/create/export | create tx | duplicate reject | `wms.view`, `barcodes.manage` | label create | `/api/barcode*` | unit PARTIAL | PARTIAL |
| Task center | `TaskCenterService` | aggregate actionable warehouse work | `getTaskCenter` | read-only | n/a | operational permissions | none | `/api/tasks` | unit PARTIAL | PARTIAL |
| Stock | `StockMovementService` | only balance mutator and ledger writer | apply, list balances/movements | all mutations tx | stock command | movement-specific | movement create | inventory routes, workflow services | unit/smoke IMPLEMENTED | IMPLEMENTED for current movements |
| Receiving | `ReceivingService` | receive sessions/lines | list/create/add/receive/complete | mutations tx | receive command | `receiving.execute` | receiving events | `/api/receiving/*` | rules/smoke PARTIAL | PARTIAL |
| Put-away | `PutawayService` | manual/generated put-away | list/generate/confirm/manual | mutations tx | PARTIAL | `putaway.execute` | work/line movement | `/api/put-away` | smoke PARTIAL | PARTIAL |
| Transfers | `TransferService` | internal moves | transfer | stock tx | stock command | `transfers.execute` | movement | `/api/transfers` | smoke PARTIAL | PARTIAL |
| Adjustments | `AdjustmentService` | corrections | adjust | stock tx | stock command | `adjustments.create` | movement | `/api/adjustments` | unit/smoke PARTIAL | PARTIAL |
| Cycle count | `CycleCountService` | count and approval | list/create/count/submit/approve/reject | mutations tx | GAP | `cycleCounts.*` | count events | `/api/cycle-counts` | unit/smoke PARTIAL | PARTIAL |
| Orders | `OrderService` | simple order demand | list/create | create tx | GAP | `picking.create/execute` | order create | `/api/orders` | unit/smoke PARTIAL | PARTIAL |
| Reservation | needed `ReservationService` | allocate/release stock | GAP | must be tx | required | `picking.create` | allocate/release | GAP | GAP | GAP |
| Picking | `PickingService` | pick work and pick line confirmation | list/create/confirm | mutations tx | pick command | `picking.*` | pick events | `/api/warehouse-work`, `/api/warehouse-work/lines/*` | unit/smoke PARTIAL | PARTIAL |
| Replenishment | `ReplenishmentService` | min/max rules and work | list/create/generate/confirm | mutations tx | GAP | `wms.manageLocations`, `putaway.execute` | rule/work/line | `/api/replenishment` | smoke PARTIAL | PARTIAL |
| Packing | `PackingService` | pack work and handoff | list/create/confirm/handoff | mutations tx | GAP | `packing.execute` | pack/handoff | `/api/packing` | smoke PARTIAL | PARTIAL |
| Reconciliation | `ReconciliationService` | ledger/balance check | reconcile | read-only | n/a | `reports.view` | none | `/api/inventory/reconciliation` | smoke PARTIAL | PARTIAL |
| Audit | `AuditService` | audit listing | list | read-only | n/a | `audit.view` | n/a | `/api/audit-logs` | smoke PARTIAL | PARTIAL |

## 10. Frontend UX Blueprint

### Worker Screens

- Layout: use scanner-oriented panels, large input, visible current task, and single primary action.
- Scan field behavior:
  - auto-focus on mount;
  - Enter submits or advances;
  - trims scanner control characters;
  - shows typed entity result where available.
- Success state: short Russian confirmation, e.g. `Товар принят`, `Товар размещён`, `Задание завершено`.
- Wrong barcode state: `Отсканирован другой товар` or `Отсканирована другая ячейка`.
- Quantity error state: `Недостаточно товара в выбранной ячейке`, `Нельзя списать больше, чем есть в наличии`.
- Permission denied state: `Недостаточно прав`.
- Duplicate submit state: replay silently if same payload; conflict says operation was already sent with different data.
- Mobile layout: one-column, thumb-friendly buttons, no dense manager tables on worker flows.
- Status: PARTIAL. Components exist, but E2E/mobile coverage is GAP.

### Manager Screens

- Use tables, filters, CSV exports where helpful, and clear exception labels.
- Must expose business state, not raw enum values.
- Must show empty/loading/error states.
- Must include audit visibility for sensitive workflows.
- Status: PARTIAL.

## 11. Production Readiness Blueprint

| Area | Requirement | Current status | Gap | Acceptance criteria |
| --- | --- | --- | --- | --- |
| Auth/session | Email/password, secure cookies, logout, protected routes | PARTIAL | reset/invite/2FA absent | Production can run with seeded/admin-created users; no dev fallback in production. |
| Password policy | Secure hash, minimum length | PARTIAL | rotation/history/reset absent | Password hashes use `scrypt`; temporary password setup documented. |
| Rate limiting | Login rate limit | IMPLEMENTED | admin lockout management absent | repeated failures get Russian error and are stored. |
| Route protection | WMS/API require session | PARTIAL | per-route API tests incomplete | middleware and service tests plus API route matrix. |
| Tenant isolation | every record scoped by `storeId` | PARTIAL | route-level cross-tenant tests incomplete | cross-tenant reads/mutations fail in service and API tests. |
| Dockerfile | production image | GAP | none | buildable Docker image with healthcheck-compatible start. |
| Deployment runbook | install, migrate, seed, start | PARTIAL | production-grade runbook incomplete | documented commands and envs. |
| Backup/restore | PostgreSQL backup process | GAP | none | runbook with backup, restore, verification. |
| Healthcheck | app and DB health | PARTIAL | no deep queue/job checks | `/api/health` checks safe runtime and DB state. |
| Structured logging | consistent operational logs | GAP | console only | request/workflow errors logged with operation/user/store context. |
| Monitoring hooks | metrics/alerts | GAP | none | health, error rate, reconciliation discrepancy alerts. |
| Migration process | noninteractive deploy | PARTIAL | dev migrate prompts documented but not fully automated | `prisma migrate deploy` validated; destructive migrations blocked. |
| Security checklist | release checklist | GAP | none | checklist covers auth, envs, cookies, DB, backups, permissions. |

## 12. Test Blueprint

| Test type | Required coverage | Current status | Next action |
| --- | --- | --- | --- |
| Unit | rules, parsers, permission matrix, stock math | IMPLEMENTED/PARTIAL | keep adding for new rules. |
| Service integration | stock workflows through Prisma tx | PARTIAL | expand beyond smoke into targeted integration tests. |
| DB smoke | end-to-end happy path | IMPLEMENTED for current flows | add reservation/allocation, route-like permissions. |
| API route tests | auth, permissions, validation, cross-tenant | GAP | create route test harness. |
| Cross-tenant tests | service and API reads/mutations | PARTIAL | add API layer tests. |
| Permission matrix tests | role capabilities and route visibility | IMPLEMENTED | update whenever permissions change. |
| Browser/mobile E2E | login, receive, put-away, transfer, cycle count, pick, pack | GAP | add Playwright or documented browser harness. |
| Scanner workflow tests | wrong barcode, quantity errors, duplicate submit | PARTIAL | add E2E and route tests. |
| Reconciliation tests | ledger equals balances | PARTIAL | add failure scenario and scheduled command test. |
| Idempotency tests | receive, pick, put-away, transfer, adjustment, replenishment, packing | PARTIAL | add replenishment/packing/cycle count idempotency. |

## 13. Acceptance Gates

### Gate 1: MVP Usable

- Required modules: auth, RBAC, warehouses/zones/locations, products/import, barcode registry, balances, ledger, receiving, put-away, transfers, adjustments, cycle counts, replenishment, basic pick/pack/handoff, reconciliation.
- Required tests: unit tests, DB smoke, permission matrix, cross-tenant guard.
- UX quality: Russian-first, no raw enum labels on worker screens, access-denied UI.
- Security level: session required, service permissions, tenant isolation.
- Allowed gaps: no E2E, no supplier model, no reservation engine only if explicitly documented as known stock-demand limitation.
- Blockers: direct stock mutation outside service, negative stock leakage, cross-tenant access, worker stock adjustment.
- Current status: PARTIAL. Major blocker for true MVP: reservation/allocation.

### Gate 2: Internal Beta

- Required modules: reservation/allocation, split-bin picking, short-pick resolution, route/API tests, replenishment/packing idempotency, improved receiving exceptions.
- Required tests: API route tests, service integration tests, DB smoke failure paths.
- UX quality: mobile scanner flows tested manually and documented.
- Security level: route-level authorization coverage.
- Allowed gaps: no carrier integration, no public password reset if admin-created users only.
- Blockers: untested critical workflow failures, no backup runbook.
- Current status: GAP.

### Gate 3: Production Pilot

- Required modules: packing session or equivalent package verification, shipment handoff records, blind/recount cycle count, scheduled reconciliation, production Dockerfile, deployment and backup runbooks.
- Required tests: browser/mobile E2E happy/failure paths.
- UX quality: workers can complete core workflows on mobile viewport.
- Security level: rate limiting, secure cookies, no dev auth fallback, route/API permission coverage.
- Allowed gaps: no EDI/carrier automation, no advanced routes.
- Blockers: missing backup/restore, no health/monitoring, no E2E.
- Current status: GAP.

### Gate 4: Public Production

- Required modules: invite/reset or SSO, observability, incident/runbook process, migration policy, audit export, label printing.
- Required tests: full regression suite including E2E, load-sensitive smoke, migration rehearsal.
- UX quality: full Russian copy audit and accessibility pass.
- Security level: production identity, account recovery, monitoring, backup restore drill.
- Allowed gaps: enterprise WMS exclusions remain out of scope.
- Blockers: any unresolved data integrity or tenant isolation risk.
- Current status: GAP.

## 14. Autonomous Implementation Roadmap

The roadmap is intentionally phase-based but not fixed-count. Split any phase if validation or design risk grows.

### Phase R1: Reservation Data Model

- Blueprint sections: Domain Model, Stock and Ledger Rules, Acceptance Gate 1.
- Goal: add first-class reservation/allocation records without changing picking behavior yet.
- Tasks: add reservation enum/model, relations to order line/location/product/variant/user; add indexes/constraints; generate Prisma client; add model documentation.
- Validation: Prisma generate, migration deploy/dev status, typecheck, lint.
- Continue when: additive migration is safe and no runtime code depends on it.
- Stop if: migration is destructive or enum migration conflicts with current database.
- Status: IMPLEMENTED. Added `InventoryReservationStatus`, `InventoryReservation`, Prisma relations, and additive migration `20260522062000_inventory_reservations`.

### Phase R2: Reservation Service And Stock State

- Blueprint sections: Stock and Ledger Rules, API and Service Architecture.
- Goal: reserve and release stock transactionally through stock service.
- Tasks: add `ReservationService`; add reservation/release stock-state operations; add audit events; ensure no direct balance mutation.
- Validation: unit tests, DB service tests, typecheck, lint, build.
- Continue when: split-bin reservation and release pass tests.
- Stop if: stock movement model cannot represent reservation without unsafe ledger ambiguity.
- Status: IMPLEMENTED at service/API foundation level. Added `RESERVE` and `RELEASE_RESERVATION` movement types, `ReservationService`, `/api/reservations`, stock-state reserve/release through `StockMovementService`, audit events, and DB smoke coverage. Still not wired into pick work generation; Phase R3 remains required.

### Phase R3: Allocation-Driven Pick Work

- Blueprint sections: Operational Workflow Blueprints, CustomerOrder, WarehouseWork.
- Goal: generate pick work from reservations instead of raw on-hand.
- Tasks: update order/picking services; support order line split across bins; prevent double allocation.
- Validation: DB smoke, service tests, route tests.
- Continue when: multi-line and split-bin picking are proven.
- Status: IMPLEMENTED at service/UI foundation level. `WarehouseWorkLine` can link to `InventoryReservation`, pick work is generated from reservations, the Russian picking UI reserves before creating work, and pick confirmation releases reserved quantity before `PICK` movement inside the same transaction. Split-bin support exists through one work line per reservation, but dedicated multi-bin UI/E2E coverage remains required.

### Phase R4: Short Pick Resolution

- Goal: turn short-pick marker into managed resolution.
- Tasks: statuses/reasons, release reservation, manager resolution UI, audit.
- Validation: service/API tests and E2E later.
- Status: IMPLEMENTED at foundation level. Added `SHORT_PICKED` order status, short-pick resolution API/service, Russian picking action, remaining reservation release through `StockMovementService`, audit event, and DB smoke coverage. Still needs dedicated route tests, manager exception queue, and browser/mobile E2E.

### Phase P1: Packing Session Model

- Goal: make packing a domain, not only work type.
- Tasks: add packing session/lines, link to order/work, verification exceptions.
- Validation: migration, service tests, DB smoke.

### Phase S1: Shipping Handoff Model

- Goal: record outbound handoff explicitly.
- Tasks: add shipping handoff table/status, audit, UI.
- Validation: service/API tests.

### Phase C1: Cycle Count Recount And Unexpected Items

- Goal: support blind/recount/unexpected count scenarios.
- Tasks: blind flag, recount attempts, unexpected lines, approval/rejection history.
- Validation: cycle count integration tests.

### Phase E1: API Route Test Harness

- Goal: prove route handlers enforce auth, permissions, validation, and tenant isolation.
- Tasks: Next request helpers, session cookie utilities, tests for critical routes.
- Validation: `pnpm test`.

### Phase E2: Browser/Mobile Scanner E2E

- Goal: prove real worker flows.
- Tasks: configure Playwright or documented harness; cover login, receive, put-away, transfer, count, pick, pack.
- Validation: `pnpm test:e2e` or documented equivalent.
- Status: PARTIAL. Playwright is installed and `pnpm test:e2e` passes with a first operational suite covering login/protected routing, core Russian navigation, product/warehouse UI creation, API-backed receive/put-away/transfer/cycle-count/pick/pack with UI verification, and Russian access-denied behavior. Remaining work is full click-through scanner/mobile workflow coverage for each operation.

### Phase U2: Product-Grade UI Foundation

- Goal: move from scaffold-like UI to a serious SaaS design foundation.
- Tasks: adopt lucide/Radix/shared primitives, replace fake nav icons, replace empty-state circles, use real Select components, redesign dashboard as an operational command center, and migrate active pages to shared primitives.
- Validation: typecheck, lint, unit tests, DB smoke, build, UI smoke, Playwright E2E.
- Status: PARTIAL. Shared primitives, real icons, icon empty states, Radix Select across active pages, a shared TanStack `DataTable`, compact `ActionMenu` for crowded admin row actions, dashboard redesign, and E2E harness are implemented and validated. Active page migration is no longer blocked by raw selects or page-local tables, but mobile-specific worker cards, form decomposition, dialogs, and full click-through scanner E2E remain incomplete.

### Phase O1: Production Operations

- Goal: deployable production pilot.
- Tasks: Dockerfile, `.dockerignore`, deployment runbook, backup/restore runbook, migration checklist, security checklist, structured logging.
- Validation: docker build, build, healthcheck.

### Phase U1: Russian UX Audit

- Goal: remove remaining raw technical labels and weak states.
- Tasks: screen-by-screen copy audit, empty/loading/error states, worker mobile layout review.
- Validation: lint/build plus visual/manual checklist.

## Blueprint Self-Review

- Specific to this repository: yes. It references current Prisma models, services, routes, pages, tests, and known gaps.
- Decision-making value: yes. It separates implemented, partial, and missing capabilities, and defines acceptance gates.
- Implementation control: yes. Roadmap phases map to blueprint sections and validation requirements.
- Not generic: yes. Gaps such as missing `Reservation`, `PackingSession`, and `Shipment` are explicit.
- Production honesty: yes. The WMS is not marked complete; major blockers remain before internal beta or production pilot.
