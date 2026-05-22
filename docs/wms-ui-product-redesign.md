# WMS UI Product Redesign

## 1. Current UI Verdict

The current standalone WMS UI is functional but still not product-grade enough for a serious SaaS warehouse product.

Verdict: `PARTIAL`, not acceptable as final UI.

Concrete problems observed in the repository:

- Navigation used fake letter placeholders (`О`, `З`, `Т`, `П`) instead of real icons.
- Empty states used a meaningless decorative circle.
- Selects were styled native controls (`selectClass = inputClass`), not a robust shared Select primitive.
- The dashboard is still too passive and metric-heavy; it needs to become an operational command center.
- Many active WMS pages are still `PARTIAL` in `docs/wms-ui-audit.md`.
- Browser smoke exists, but it is not click-through E2E workflow coverage.
- Forms, tables, and scanner flows are more consistent than before, but still too dense in key operational screens.

## 2. Library Adoption Plan

Adopt these libraries because they directly address current gaps:

| Library | Why | Status |
| --- | --- | --- |
| `lucide-react` | Real navigation, empty-state, action, and status icons. | INSTALLED / IN USE |
| `@radix-ui/react-select` | Accessible, polished Select primitive replacing browser-default selects. | INSTALLED / PILOTED |
| `@radix-ui/react-dialog` | Modal/dialog foundation for destructive confirmations and guided admin flows. | INSTALLED / PRIMITIVE READY |
| `@radix-ui/react-dropdown-menu` | Row/action menus and compact command surfaces. | INSTALLED / PRIMITIVE READY |
| `@radix-ui/react-tabs` | Settings/product page decomposition without overwhelming long pages. | INSTALLED / PRIMITIVE READY |
| `@radix-ui/react-popover` | Scanner help, date/filter popovers, contextual explanations. | INSTALLED |
| `react-hook-form` | Predictable form state and field-level validation. | INSTALLED / NOT YET MIGRATED |
| `zod` | Shared validation schemas and Russian error messages. | INSTALLED / NOT YET MIGRATED |
| `@tanstack/react-table` | Real data table foundation for stock, movements, audit, products. | INSTALLED / NOT YET MIGRATED |
| `sonner` | Consistent Russian toast feedback. | INSTALLED / NOT YET MIGRATED |
| `date-fns` | Date formatting for movements, audit, dashboard. | INSTALLED / NOT YET MIGRATED |
| `papaparse` / `xlsx` | Real product import parsing beyond pasted CSV text. | INSTALLED / NOT YET MIGRATED |
| `@playwright/test` | Browser workflow and mobile/scanner E2E. | INSTALLED / FIRST SUITE PASSING |

## 3. Component System Plan

Create a real shared UI layer under `src/components/ui`.

Required components:

- `Button`: primary, secondary, ghost, danger, loading-ready.
- `Input`: label pairing through `Field`, error/helper state.
- `Select`: Radix Select with `ChevronDown`, no text/arrow collision, disabled/error state.
- `Textarea`: same rhythm as input.
- `Badge`: semantic variants only.
- `Card`: header/body/footer friendly surface.
- `Table`: wrapper and table primitives, later TanStack-backed data tables.
- `Dialog`: Radix Dialog for modals and confirmations.
- `Dropdown`: Radix menu for row actions.
- `Tabs`: Radix Tabs for large settings/admin pages.
- `PageHeader`: existing component remains, but must pair with actions and breadcrumbs later.
- `EmptyState`: icon prop, meaningful icon, action, no empty circle.
- `LoadingState` / `ErrorState`: consistent page feedback.
- `StatusBadge`: central Russian status mapping.
- `ScannerStepLayout`: worker-first scan screens.

## 4. Navigation Redesign Plan

Replace fake letters with real icons:

| Item | Icon |
| --- | --- |
| `Обзор` | `LayoutDashboard` |
| `Задачи` | `ClipboardList` |
| `Товары и остатки` | `Boxes` |
| `Приёмка` | `PackageCheck` |
| `Сборка и упаковка` | `PackageSearch` |
| `Инвентаризация` | `ScanSearch` |
| `Пополнение` | `RefreshCw` |
| `Склады` | `Warehouse` |
| `Журнал` | `History` |
| `Настройки` | `Settings` |

Navigation rules:

- Icons must be real SVG icons from `lucide-react`.
- Active state must be obvious but calm.
- Sidebar must feel workflow-first, not database-first.
- Mobile nav must remain horizontally scrollable but use better spacing and active states.
- Role visibility remains server-driven.

## 5. Dashboard Redesign Plan

The dashboard must become a command center.

It should answer:

- `Что требует действия сейчас?`
- `Что срочно?`
- `Где проблемы?`
- `Что нужно принять?`
- `Что нужно разместить?`
- `Что нужно собрать?`
- `Где расхождения?`
- `Что заблокировано?`
- `Что делать дальше?`

Target layout:

- Primary action queue at top.
- Exception panel for discrepancies, blocked stock, short picks.
- Operational cards for receiving, put-away, picking, replenishment.
- Recent movements as secondary context, not the main focus.
- Direct action links to the next workflow.

## 6. Empty State Redesign Plan

Empty states must use meaningful icons:

- No decorative empty circles.
- `PackageOpen` for no stock/tasks.
- `ClipboardList` for no work.
- `Warehouse` for no warehouses.
- `ScanBarcode` for no barcodes.
- `History` for no movement/audit.
- `AlertTriangle` for no discrepancies or exceptions.

Each empty state must include:

- icon
- short title
- clear description
- optional action button
- calm neutral styling

## 7. Select/Input/Form Redesign Plan

Selects must not be native-looking browser controls as final UI.

New Select requirements:

- Radix Select.
- `ChevronDown` icon.
- selected value never overlaps icon.
- label/helper/error support through `Field`.
- disabled state.
- consistent height with inputs.
- readable content panel.
- Russian labels.

Form plan:

- Keep current class helpers only as migration bridge.
- New forms should use UI primitives.
- Important forms should migrate to `react-hook-form` + `zod`.
- Error messages must be Russian and actionable.

## 8. Table Redesign Plan

Current tables are readable but still not product-grade.

Plan:

- Create shared table primitives now.
- Introduce TanStack tables for stock, movement history, audit, products.
- Add column alignment, empty states, responsive overflow, row actions.
- Avoid cramped row action buttons; use dropdown menus where appropriate.

## 9. Worker Scanner Flow Redesign Plan

Scanner pages must feel like handheld/RF workflows, not admin forms.

Required improvements:

- One primary instruction at a time.
- Large scan field.
- Clear next action.
- Wrong barcode state.
- Duplicate submit protection.
- Mobile-safe layout.
- Sticky action/footer where task confirmation is long.
- No nested forms.
- No auto-focus that scrolls mobile viewport into blank content.

## 10. E2E Visual/Workflow Test Plan

Browser screenshot smoke is not enough.

Add Playwright:

- Use system Chrome channel locally to avoid required browser downloads.
- Cover login.
- Cover create product.
- Cover create warehouse/location.
- Cover receive stock.
- Cover put-away.
- Cover transfer.
- Cover create order.
- Cover pick order.
- Cover cycle count.
- Cover permission denied.

Acceptance:

- `pnpm test:e2e` exists.
- E2E tests exercise real UI actions plus API-backed operational workflows, not only screenshot capture.
- Mobile viewport coverage exists for login, navigation, product/warehouse creation, API-backed operational flow verification, and access denial.
- Screenshots/traces are kept in ignored output folders.

Current limitation: the operational E2E uses API setup/execution for parts of receive, put-away, transfer, cycle count, pick, and pack, then verifies UI state. Full scanner click-through coverage for every workflow remains required before final UI sign-off.

## Implementation Phases

### UI-R1: Library Adoption And Foundation

- Install product UI/E2E libraries.
- Add this document.
- Add `src/components/ui` primitives.
- Replace fake navigation icons.
- Replace empty-state circle.
- Introduce Radix Select component.
- Status: PARTIAL. Libraries and shared primitives exist; only a pilot page uses Radix Select so far.

### UI-R2: Dashboard Command Center

- Redesign `/wms` around action queues and exceptions.
- Use real icons and action cards.
- Keep metrics secondary.
- Status: PARTIAL. `/wms` now prioritizes action cards for receiving, put-away, picking, and discrepancies. More exception queues remain needed.

### UI-R3: Active Page Component Migration

- Replace native selects in active WMS pages with shared `Select`.
- Replace custom tables with shared `Table`.
- Replace page-specific actions with `Button`, `Dropdown`, `Dialog`.

### UI-R4: Worker Workflow Redesign

- Receiving, put-away, transfer, picking, packing, cycle count, replenishment get scanner-first screens.
- Use sticky actions and clear success/error states.

### UI-R5: Playwright E2E

- Add config and tests.
- Cover login and key workflows.
- Keep browser smoke as quick render guard.
- Status: PARTIAL. `pnpm test:e2e` passes on desktop and mobile with login/protection, real icons, product/warehouse creation, API-backed operational workflow verification, and access-denied checks. Scanner click-through tests remain open.

### UI-R6: Final Visual Audit

- Update `docs/wms-ui-audit.md`.
- Mark pages `IMPLEMENTED` only after real redesign and E2E coverage.
- Full validation: typecheck, lint, unit tests, DB smoke, build, UI smoke, E2E.
