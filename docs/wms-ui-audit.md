# WMS UI Audit

This audit is based on the current standalone WMS code in `src/app/wms` and shared components in `src/components`. Status values are updated as fixes land.

## Summary

The UI foundation is improving but is not complete. The repo now has product-grade dependencies (`lucide-react`, Radix primitives, TanStack Table, React Hook Form, Zod, Sonner, date-fns, Papaparse/XLSX, Playwright), real navigation icons, an icon-based empty state, a Radix Select primitive, a shared TanStack-backed `DataTable`, and a first Playwright E2E harness. Remaining blockers are dense operational/admin screens, sticky mobile action areas, row-action/menu polish, and full click-through scanner workflow E2E.

## Shared Components

| Component | Current issue | Why it is bad | Target | Required fix | Priority | Files | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App shell | Letter placeholders were used as fake icons. | Feels like a scaffold and workers cannot orient quickly. | Workflow-first SaaS navigation with real icons, active/hover states, role visibility. | Use `lucide-react` icon map for every primary nav item. | P0 | `src/components/AppShell.tsx`, `src/components/NavItem.tsx` | IMPLEMENTED |
| Form controls | Native selects were still present across active pages. | Native selects felt less polished than product-grade controls. | Radix Select for active forms; styled native fallback only for non-WMS legacy use. | Replace page-level native selects with shared `Select`. | P0 | `src/components/FormControls.tsx`, `src/components/ui/Select.tsx`, WMS pages | IMPLEMENTED |
| UI primitives | Runtime dependencies and primitives were too thin for a serious SaaS UI. | Missing primitives caused random page-local controls and inconsistent states. | Shared Button/Input/Select/Textarea/Badge/Card/DataTable/Dialog/Dropdown/Tabs primitives. | Adopt Radix/lucide/TanStack primitives and keep migrating active pages. | P0 | `src/components/ui/*`, `package.json` | PARTIAL |
| Buttons/actions | Inline row action buttons still existed on admin tables. | Crowded row actions reduce trust and make tables feel like a scaffold. | Primary/secondary/ghost/danger buttons plus compact shared action menu for row actions. | Continue migrating operational row actions where menus improve clarity. | P0 | `FormControls.tsx`, `src/components/ui/ActionMenu.tsx`, pages | PARTIAL |
| StatusBadge | Binary green/gray only. | Does not distinguish warning/danger/progress/blocked. | Central status mapping to neutral/info/success/warning/danger/blocked/progress. | Replace logic with status visual map. | P0 | `src/components/StatusBadge.tsx` | IMPLEMENTED |
| EmptyState | Meaningless empty circle was used. | Empty states looked unfinished and did not explain the missing work. | Icon-based empty state with title, description, action, and variants. | Use meaningful lucide icon per context. | P1 | `src/components/EmptyState.tsx` | IMPLEMENTED |
| PageHeader | Basic title/description only. | Weak hierarchy on complex pages. | Header with optional eyebrow/action and better spacing. | Improve typography and action placement. | P1 | `src/components/PageHeader.tsx` | IMPLEMENTED |
| NoticeBanner | Basic color blocks. | Inconsistent with desired badge/status tone. | Subtle bordered success/error/info. | Tune colors, radius, spacing. | P1 | `src/components/wms/NoticeBanner.tsx` | IMPLEMENTED |
| ScannerStepLayout | Functional but uppercase labels and small cards feel generic. | Worker flows need more confidence and clarity. | Three clear guide panels, mobile first, no shouty uppercase. | Polish spacing, labels, helper panels. | P0 | `ScannerStepLayout.tsx`, `ScanField.tsx` | IMPLEMENTED |
| QuantityStepper | Functional but buttons can feel chunky/inconsistent. | Quantity controls are core scanner interaction. | Consistent 44px controls, strong focus, disabled state. | Use shared control sizes and button variants. | P1 | `QuantityStepper.tsx` | PARTIAL |
| WorkflowHub | Static cards improved but still plain. | Hubs should feel intentional and premium. | Consistent card/action/status treatment. | Use shared card/action styles. | P1 | `WorkflowHub.tsx` | IMPLEMENTED |

## Page Audit

| Page | Current issue | Reference-quality target | Required fix | Priority | Files | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Обзор` | Previously passive metrics made the dashboard feel like a dev scaffold. | Operational command center that answers what needs action now. | Action cards for receiving, put-away, picking, discrepancies, plus contextual metrics. | P1 | `src/app/wms/page.tsx` | PARTIAL |
| `Задачи` | Functional task center, but card styling is custom. | Worker task center with polished cards and clear actions. | Use shared card/action/status patterns. | P0 | `src/app/wms/tasks/page.tsx` | IMPLEMENTED |
| `Товары и остатки` | Hub is clean but plain. | Clear grouped entry points. | Use improved WorkflowHub. | P1 | `src/app/wms/stock/page.tsx` | IMPLEMENTED |
| `Приёмка` | Large functional page; row controls are still dense even after shared table migration. | Scanner-first receiving with polished controls, clear success/error. | Split expected/actual receiving rows into guided subcomponents and mobile sticky actions. | P0 | `src/app/wms/receiving/page.tsx` | PARTIAL |
| `Размещение` | Worker flow exists but page still mixes manual and generated work. | Directed put-away task screen with clear next step. | Continue task-first redesign; Select migration is done. | P0 | `src/app/wms/put-away/page.tsx` | PARTIAL |
| `Перемещения` | Form is functional but still wizard-like rather than handheld-simple. | Clean scanner-compatible transfer wizard. | Continue worker flow polish; Select migration is done. | P0 | `src/app/wms/transfers/page.tsx` | PARTIAL |
| `Сборка заказов` | Functional but visually busy; short-pick action is another secondary button. | Guided pick task with clear reserve/pick/short states. | Continue worker task card redesign; Select migration is done. | P0 | `src/app/wms/picking/page.tsx` | PARTIAL |
| `Упаковка` | Good foundation but custom cards/messages. | Clear verification screen. | Continue guided verification screen redesign; Select migration is done. | P0 | `src/app/wms/packing/page.tsx` | PARTIAL |
| `Инвентаризация` | Shared table is readable, but inline count inputs still make the screen dense on mobile. | Count table with readable rows and clear actions. | Replace line rows with dedicated count cards on small screens. | P1 | `src/app/wms/cycle-counts/page.tsx` | PARTIAL |
| `Пополнение` | Operational page but cards/forms custom. | Work/rule screen with status clarity. | Shared cards, statuses, controls. | P1 | `src/app/wms/replenishment/page.tsx` | PARTIAL |
| `Склады` / `Склады и ячейки` | Tables and row actions now use shared surfaces, but setup forms are still dense. | Admin setup with clean forms, readable tables, restrained actions. | Decompose forms into sections/tabs and continue form polish. | P0 | `locations/page.tsx`, `warehouses/page.tsx` | PARTIAL |
| `Товары` | Product import and forms are functional but admin-heavy; table and row actions now use shared primitives. | Clean catalog admin screen with polished import errors. | Decompose import/create/variant sections and improve import error presentation. | P1 | `products/page.tsx` | PARTIAL |
| `Штрихкоды` | Simple registry; likely form/select issues. | Clean label registry and export panel. | Shared controls/table. | P1 | `barcodes/page.tsx` | IMPLEMENTED |
| `Остатки` | Table can be dense; status unavailable split needs clear visual hierarchy. | Calm searchable stock table. | Global table, badges, empty/loading/error. | P1 | `inventory/page.tsx` | IMPLEMENTED |
| `История движений` | Ledger table needs readability and consistent movement labels. | Audit-quality movement history. | Global table/status styles. | P1 | `movements/page.tsx` | IMPLEMENTED |
| `Журнал` | Hub is clean but plain. | Control journal hub. | WorkflowHub polish. | P2 | `journal/page.tsx` | IMPLEMENTED |
| `Журнал действий` | Audit table/list may be dense. | Readable audit log with labels. | Global table/status styles. | P1 | `audit/page.tsx` | IMPLEMENTED |
| `Проверка остатков` | Reconciliation tables/cards custom. | Clear discrepancy review. | Global table/card styles. | P1 | `reconciliation/page.tsx` | IMPLEMENTED |
| `Настройки` | Very large page; user access table and row actions now use shared primitives, but the page still needs tabs and section focus. | Calm admin settings with consistent sections. | Split sections into tabs/cards and add clearer action grouping. | P0 | `settings/page.tsx` | PARTIAL |
| `Доступ запрещён` | Copy is correct; card is basic. | Calm access-denied state. | Use shared card/button styles. | P1 | `AccessDenied.tsx` | IMPLEMENTED |

## Cross-Cutting Issues

| Issue | Why it matters | Fix | Priority | Status |
| --- | --- | --- | --- | --- |
| Fake letter nav icons | Letter badges made the product feel unfinished. | Replace with real lucide icons mapped to workflow nav. | P0 | IMPLEMENTED |
| Select arrow and padding | Native WMS selects were raw/cramped. | Shared Radix Select plus styled native fallback. | P0 | IMPLEMENTED |
| Empty circles | Empty-state decoration looked meaningless. | Icon-based empty states with action support. | P0 | IMPLEMENTED |
| Raw inline error/loading blocks | Inconsistent color/radius/spacing. | Add `LoadingState`, `ErrorState`; gradually replace. | P1 | IMPLEMENTED |
| Tables | Active pages previously repeated raw `<table>` markup. | Shared TanStack-backed `DataTable` with consistent spacing, alignment, overflow, and hover state. | P0 | IMPLEMENTED |
| Badges | Binary status color is misleading. | Central visual status map. | P0 | IMPLEMENTED |
| Text buttons | Edit/deactivate actions are inconsistent. | Use ghost/danger button classes. | P1 | PARTIAL |
| Mobile scanner UI | Functional but not visually strong enough. | Improve scanner components first. | P0 | PARTIAL |
| E2E visual/workflow coverage | Browser smoke exists and Playwright is now installed, but tests are still foundation-level. | Keep screenshot smoke; grow Playwright into full scanner click-through coverage. | P0 | PARTIAL |
| UI regression contract | No guard against reintroducing scaffold classes. | Active pages should stay on shared primitives. | P1 | IMPLEMENTED |

## Phase Tracking

### UI Phase 1: Design System And Audit

- Status: IMPLEMENTED.
- Acceptance: this document and `docs/wms-ui-design-system.md` exist and list concrete files/gaps.

### UI Phase 2: Shared Primitive Hardening

- Status: IMPLEMENTED at shared primitive level; page-by-page redesign remains Phase 3.
- Acceptance: shared primitives are polished, and `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build` pass.

### UI Phase 3: Active Screen Application

- Status: PARTIAL.
- Acceptance: active WMS pages use shared primitives or global WMS styles; no obvious raw select/table/badge scaffolding.
- Progress: dashboard, barcode registry, stock, movement history, audit log, and access-denied state now use shared loading/error/card/table/button primitives. Worker flows and dense setup pages still need page-level polish.

### UI Phase 4: Worker Flow Polish

- Status: PARTIAL.
- Acceptance: receiving, put-away, picking, packing, cycle count, and replenishment use scanner-friendly shared cards, feedback states, table wrappers, and no premature empty states.
- Progress: worker flow pages now use shared card/loading/table primitives in the main task surfaces. Remaining work: visual QA on mobile viewports, sticky action areas, and replacing the densest inline row controls with purpose-built worker subcomponents.

### UI Phase 5: Admin And Utility Screen Consistency

- Status: PARTIAL.
- Acceptance: products, warehouses, locations, settings, tasks, transfers, adjustments, and reconciliation use shared feedback/card/table/action primitives.
- Progress: active setup and utility screens now use shared card/table/loading/error primitives. Remaining work: split the largest settings/products sections into smaller UI modules, add browser/mobile smoke coverage, and complete visual review.

### UI Phase 6: UI Contract Tests

- Status: IMPLEMENTED as local guard coverage.
- Acceptance: a fast Vitest contract prevents active WMS pages from reintroducing removed scaffold classes and requires shared page headers/loading/error patterns.
- Remaining gap: this is not browser/mobile visual E2E. Playwright or an equivalent browser harness is still required before production UI sign-off.

### UI Phase 7: Browser Smoke Harness

- Status: IMPLEMENTED as no-dependency screenshot smoke.
- Acceptance: `pnpm ui:smoke` starts Next with safe dev auth fallback and captures desktop/mobile screenshots for login, overview, tasks, receiving, picking, and settings.
- Remaining gap: this is visual render smoke, not full click-through E2E for warehouse workflows.

### UI Phase 8: Product UI Foundation And E2E Harness

- Status: PARTIAL.
- Acceptance: fake letter nav icons are gone, shared product-grade UI primitives exist, the warehouse form uses the real Select pilot, the dashboard is action-oriented, and `pnpm test:e2e` exists.
- Progress: installed the requested UI/runtime libraries, added lucide navigation icons, replaced the empty-state circle with a contextual icon component, added Radix Select/Dialog/Dropdown/Tabs primitives, redesigned the dashboard around operational actions, and added Playwright tests for login/protected routing, product creation, warehouse creation, a full API-backed receive/put-away/transfer/count/pick/pack flow with UI verification, and Russian access-denied behavior.
- Validation: `git diff --check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm ui:smoke`, and `pnpm test:e2e` pass.
- Remaining gap: many active pages still contain native selects and dense custom form/table sections. The Playwright workflow test proves the operational backend through a browser session, but it is not yet a full click-through scanner workflow for every operation.

### UI Phase 9: Active Select Migration

- Status: IMPLEMENTED.
- Acceptance: no native `<select>` tags remain in `src/app/wms` or `src/components`; active WMS screens use `src/components/ui/Select`.
- Progress: migrated filters, worker flows, admin setup screens, settings, warehouse rules, replenishment, packing, picking, receiving, put-away, transfers, inventory, movements, audit, products, barcodes, cycle counts, adjustments, and locations.
- Remaining gap: this removes raw select controls, but many large pages still need deeper layout/table/action redesign.

### UI Phase 10: Active DataTable Migration

- Status: IMPLEMENTED.
- Acceptance: active WMS pages do not render raw page-local `<table>` markup and do not import the old `tableWrapClass`; all active table surfaces use `src/components/ui/DataTable`.
- Progress: migrated stock, movement history, audit, warehouses, products, locations, barcode labels, reconciliation, receiving lines, cycle count lines, and settings user access to the shared TanStack-backed table surface. Added a UI contract test to prevent raw page-local tables from returning.
- Remaining gap: this normalizes table surfaces, but dense worker rows in receiving/cycle count and large settings/product forms still need mobile-specific cards, sticky actions, and row-action menus.

### UI Phase 11: Shared Row Action Menu

- Status: PARTIAL.
- Acceptance: busy manager/admin tables should not show cramped edit/deactivate/delete button groups inline.
- Progress: added `src/components/ui/ActionMenu.tsx`, expanded Radix dropdown item disabled state, and migrated warehouse, location, product, product variant, and settings user-access row actions to the shared menu.
- Remaining gap: operational worker actions are intentionally still explicit buttons; future pass should evaluate movement exceptions, replenishment rules, and settings rule cards for action-menu fit.
