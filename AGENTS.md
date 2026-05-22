# AGENTS.md

## Project Context

This repository is a standalone Warehouse Management System product built with TypeScript, React, Next.js, Prisma, PostgreSQL, and Tailwind.

The WMS must be practical for small and medium retail, wholesale, and e-commerce operations. Do not build an enterprise SAP-like WMS in the first iteration.

The app owns its own tenants/companies/stores, users, roles, products, variants, warehouses, locations, inventory, orders, warehouse work, and audit history. Do not assume this project integrates with another platform unless the user explicitly asks for that later.

## Engineering Rules

- Use existing project conventions.
- Inspect existing models, routes, services, permissions, UI components, table components, modal components, form components, navigation, and audit-log patterns before coding.
- Do not introduce new libraries unless clearly necessary.
- Do not break existing standalone product, order, inventory, warehouse, tenant, or store-scoping behavior.
- Keep tenant/store-level separation strict. In the current schema, `Store` and `storeId` are the tenant/company/store boundary.
- Prefer reusable services over duplicated route logic.
- All stock-changing operations must go through a central stock movement service.
- Do not update warehouse stock directly from UI routes or random handlers.
- Stock movement creation and stock balance updates must run in a database transaction.
- Add tests for critical stock logic.
- After changes, run the available validation commands: typecheck, lint, tests, and build where applicable.
- If validation fails, fix the failure before moving to the next phase.

## WMS MVP Scope

Build only the MVP:

- tenants/companies/stores
- users and roles
- products and variants
- warehouses
- warehouse locations/bins
- location barcodes
- inventory balances by location
- append-only inventory movement ledger
- receiving
- put-away
- internal transfers
- stock adjustments
- cycle counts
- simple picking
- WMS dashboard
- WMS permissions
- WMS movement history

Do not build in MVP:

- wave picking
- batch picking
- advanced route optimization
- warehouse robotics
- EDI
- carrier automation
- cartonization
- yard management
- dock scheduling
- advanced labor analytics
- multi-client 3PL logic

## WMS Architecture Rules

Use real WMS-inspired structure:

- Warehouse
- Warehouse Zone
- Warehouse Location
- Inventory Location Balance
- Inventory Movement
- Receiving Session
- Receiving Line
- Warehouse Work
- Warehouse Work Line
- Cycle Count Session
- Cycle Count Line

Warehouse work should be modeled as a header with executable lines.

Example:

- `warehouse_work` = Pick Order #123
- `warehouse_work_lines` = scan location, pick product, move to picked/packing status

Separate physical location from reservation/allocation state. Do not treat `RESERVED` as a physical location unless the business flow actually moves stock.

## Required Work Rhythm

Work in phases. At the end of each phase, summarize:

- files changed
- behavior added
- validation commands run
- remaining risks
- next phase
