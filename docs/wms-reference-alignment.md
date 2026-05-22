# WMS Reference Alignment

This document maps the standalone WMS against public production WMS patterns. It is not a vendor-copy plan. The goal is to borrow proven concepts while keeping the product simple for Russian-speaking warehouse teams.

Sources used:

- Microsoft Dynamics 365 Warehouse Management location directives and work templates: https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/create-location-directive
- Oracle WMS Cloud cycle count triggers/tasking: https://docs.oracle.com/en/cloud/saas/warehouse-management/26a/owmol/configuring-cycle-count-triggers.html
- NetSuite WMS item put-away/bin availability: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1541436047.html
- Odoo Inventory/Barcode operations, routes, putaway, replenishment, barcode printing: https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp.html
- SAP EWM warehouse tasks and physical inventory concepts: https://help.sap.com/docs/SAP_SUPPLY_CHAIN_MANAGEMENT/f41048b9ca054326bb9774db1d46e866

## Microsoft Dynamics 365 Warehouse Management

Relevant concepts:

- Work templates that define executable warehouse work.
- Location directives that choose where to pick, put, stage, or replenish.
- Directive sequence and simple acceptance/validation of rules.
- Mobile warehouse work where users confirm steps with scans.
- Disposition/status-driven receiving, including quarantine or inspection paths.

Already implemented:

- `warehouse_work` and `warehouse_work_lines` for pick work.
- Warehouse locations and flags for receivable, pickable, sellable.
- Scanner-friendly flows for receiving, put-away, transfers, cycle counts, and picking.
- Central stock movement service and append-only movements.
- Simple work-template records and location-directive records.
- Default receiving location and priority pick-location rules.
- MVP min/max replenishment rules and replenishment warehouse work.

Missing:

- Directed put-away suggestions.
- Scheduled replenishment generation and priority queues.
- Acceptance tests for directives.

Out of MVP:

- Full Dynamics-style query builder and directive sequencing engine.
- Warehouse groups/sites, license plates, advanced load/shipment work.
- Complex work breaks and consolidation rules.

Must add:

- Simple Russian setup for default receiving location, preferred put-away zones, pickable locations, damaged/blocked locations.
- Simple work-template records for `RECEIVE`, `PUTAWAY`, `TRANSFER`, `REPLENISHMENT`, `PICK`, `PACK`.
- Directed suggestions without exposing enterprise terms to warehouse workers.

## Oracle WMS Cloud

Relevant concepts:

- Tasking based on warehouse exceptions.
- Directed put-away and directed picking.
- Cycle count tasks triggered by mismatch, short pick, rejected count, or location flags.
- Barcode/RF flows where scan mismatch can create follow-up work.

Already implemented:

- Cycle count sessions and approval.
- Reject/recount path.
- Pick shortage marker (`SHORT_PICK_REVIEW`).
- Scanner validation for location/product.
- Audit and movement history.

Missing:

- Automatic cycle count generation from short pick.
- Cycle count generation from put-away mismatch.
- Location `to be counted` flag.
- Exception task queue.
- Replenishment work from low pick stock.

Out of MVP:

- LPN/container flows.
- MHE/automation triggers.
- Full Oracle task priority engine.

Must add:

- Simple exception-triggered cycle count for short picks and count rejection.
- Simple replenishment work generation.
- Clear Russian `Требует проверки` queue.

## NetSuite WMS

Relevant concepts:

- Receiving into staging/receiving and put-away to bin locations.
- Inventory becomes available for allocation after put-away to storage.
- Mobile receiving, put-away, picking, packing, shipping, cycle counting.
- Barcode-driven item/bin confirmation.
- Pick-pack-ship handoff.

Already implemented:

- Receiving sessions and receiving locations.
- Put-away from receiving to storage/picking.
- Location balances and movement history.
- Simple picking from pickable locations.
- Russian barcode-friendly worker pages.
- Basic packing work after picking.
- Ready-to-ship handoff status.
- Order-level packed and ready-to-ship states.

Missing:

- Product/location label printing foundation.
- Product import for realistic SKU setup.

Out of MVP:

- Carrier integrations.
- Cartonization.
- Parcel rating/labels.
- Wave/batch picking.

Must add:

- Simple `Упаковка` flow with product verification.
- Order status transitions through picked, packed, ready to ship.
- Barcode label registry and printable/exportable labels.

## Odoo Inventory / Barcode

Relevant concepts:

- Practical SMB warehouses and locations.
- Barcode app for receipts, delivery orders, internal transfers, inventory adjustments.
- Putaway rules, routes, push/pull rules, replenishment.
- Print product and location barcodes.
- Inventory adjustment and cycle count workflows.

Already implemented:

- SMB-friendly warehouses, zones, locations.
- Barcode resolution for product, location, order, and work.
- Internal transfers and adjustments.
- Cycle counts and movement history.
- Russian simple UI.

Missing:

- Product import.
- Barcode label printing/export.
- Routes/rules at MVP level.
- Replenishment min/max rules.
- Browser/mobile e2e tests for barcode workflows.

Out of MVP:

- Complex multi-step route engine.
- Manufacturing and lot/serial workflows.
- GS1 parsing beyond simple code lookup.

Must add:

- CSV product import.
- Label registry with product and location label export.
- Min/max replenishment rules for pick locations.

## SAP EWM-Style Concepts

Relevant concepts:

- Warehouse task as a document that executes put-away, picking, internal movements, goods receipt/issue, and stock changes.
- Storage bins as the physical location level.
- Physical inventory documents, count results, difference posting.
- Difference monitor and tolerance/approval concepts.
- RF/mobile confirmation of tasks.

Already implemented:

- Work header/lines.
- Locations/bins.
- Cycle count sessions, count lines, approval, and stock corrections.
- Movement ledger and reconciliation report.

Missing:

- Warehouse work for replenishment and packing.
- Physical inventory tolerance/approval thresholds.
- Difference monitor beyond basic reconciliation.
- Role-specific work queues.

Out of MVP:

- Handling units.
- Yard/labor/resource management.
- ERP integration and posting changes to accounting.

Must add:

- Replenishment work type.
- Packing work/foundation.
- Discrepancy queue and clearer count exception handling.

## Roadmap Converted From Reference Gaps

1. Production auth and sessions: email/password login, secure HTTP-only sessions, protected routes/APIs, role mapping. Status: implemented as an MVP default; still needs invite/reset/rate-limit hardening.
2. Work templates and location directives: simple default locations, put-away preferences, pickable/damaged/blocked rules. Status: implemented at MVP level; directed put-away/replenishment behavior still pending.
3. Replenishment: min/max pick stock, generate replenishment work from storage to picking. Status: implemented at MVP level; scheduled generation and source optimization still pending.
4. Whole-command idempotency: receiving and picking, not only movement-only commands. Status: implemented for receiving and picking; replenishment and future packing/shipping still pending.
5. Packing and shipping foundation: verify picked items, pack order, ready-for-shipping handoff. Status: implemented at MVP foundation level; cartons/labels/carriers still pending.
6. Product import and barcode labels: CSV import, label registry, printable/exportable product/location labels.
7. Exception-triggered cycle count: short pick and rejected count create `Требует проверки` count/work items.
8. Browser/mobile workflow tests or documented test harness.
9. Production readiness: structured logging, Dockerfile, backup/restore runbook, scheduled reconciliation.
10. UX hardening: Russian copy audit, role-aware navigation, empty/loading/error states, scanner workflow review.

## Implementation Notes

### Auth And Sessions Completed

- Added email/password login with Russian UI.
- Added salted `scrypt` password hashes and seed admin password instructions.
- Added server-side sessions with secure HTTP-only cookies.
- Protected `/wms` routes and non-auth API routes when `ALLOW_DEV_AUTH_FALLBACK` is not explicitly enabled.
- Added organization context to the session and guarded organization switching by membership.
- Added production-oriented roles: `Owner`, `Admin`, `Warehouse Manager`, `Warehouse Worker`, `Viewer`, displayed in Russian.
- Remaining reference-driven security gaps: invite flow, password reset, rate limiting, account lockout, 2FA/SSO, and route/browser permission matrix.

### Work Templates And Directives Started

- Added simple work templates for enabled warehouse work types.
- Added simple location directives for default receiving, put-away zone preference, pick locations, damaged stock location, and future replenishment zones.
- Receiving can use the configured default receiving location.
- Pick work creation sorts candidate source locations by configured pick directive priority.
- Remaining reference-driven gaps: directed put-away suggestions, conflict diagnostics, and richer acceptance tests.

### Replenishment Started

- Added min/max replenishment rules for pick locations.
- Added replenishment work generation from a source location or zone.
- Added scanner confirmation that moves stock with a transactional transfer movement.
- Remaining reference-driven gaps: automatic/scheduled generation, priority queue, better source selection, and exception workflows.

### Whole-Command Idempotency Started

- Receiving and picking now guard the whole workflow command, not only the stock movement row.
- Duplicate scanner submissions with the same command key are safe.
- Remaining reference-driven gaps: apply the same pattern to replenishment and packing/shipping.

### Packing And Shipping Handoff Started

- Added pack work after picking.
- Added product and quantity verification in Russian.
- Added packed and ready-to-ship order statuses.
- Remaining reference-driven gaps: carton/package records, shipping labels, carrier integration, and packing idempotency.
