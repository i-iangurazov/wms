# WMS UI Audit

This audit is based on the current standalone WMS code in `src/app/wms` and shared components in `src/components`. Status values are updated as fixes land.

## Summary

The current UI is functionally broad but visually uneven. Most screens reuse a small component set, which is good for hardening. The main problems are weak select styling, inconsistent status badges, inconsistent page cards/forms, cramped tables, page-specific error/loading states, and worker screens that need stronger scanner/product polish.

## Shared Components

| Component | Current issue | Why it is bad | Target | Required fix | Priority | Files | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App shell | Plain sidebar links, no icons, weak active state, mobile nav is basic chips. | Feels like a scaffold and workers cannot orient quickly. | Workflow-first SaaS navigation with icons, active/hover states, role visibility. | Add nav icon map, active state through CSS, stronger sidebar/mobile styling. | P0 | `src/components/AppShell.tsx`, `src/app/globals.css` | PARTIAL |
| Form controls | `inputClass` is minimal and used for selects; select arrow can sit too close to text. | Looks like default form UI and can clip Russian values. | Polished shared control class with focus, disabled, select arrow padding. | Add `wms-control`, `selectClass`, textarea, button variants. | P0 | `src/components/FormControls.tsx`, `src/app/globals.css` | IMPLEMENTED |
| Buttons | Only primary/secondary; inline text buttons exist on pages. | Random action styles reduce trust and clarity. | Primary/secondary/ghost/danger with consistent height and disabled state. | Extend button classes and replace worst inline page buttons. | P0 | `FormControls.tsx`, pages | PARTIAL |
| StatusBadge | Binary green/gray only. | Does not distinguish warning/danger/progress/blocked. | Central status mapping to neutral/info/success/warning/danger/blocked/progress. | Replace logic with status visual map. | P0 | `src/components/StatusBadge.tsx` | IMPLEMENTED |
| EmptyState | Basic dashed box only. | Looks unfinished and lacks action support. | Calm empty panel with optional action. | Add action slot and improved spacing. | P1 | `src/components/EmptyState.tsx` | IMPLEMENTED |
| PageHeader | Basic title/description only. | Weak hierarchy on complex pages. | Header with optional eyebrow/action and better spacing. | Improve typography and action placement. | P1 | `src/components/PageHeader.tsx` | IMPLEMENTED |
| NoticeBanner | Basic color blocks. | Inconsistent with desired badge/status tone. | Subtle bordered success/error/info. | Tune colors, radius, spacing. | P1 | `src/components/wms/NoticeBanner.tsx` | IMPLEMENTED |
| ScannerStepLayout | Functional but uppercase labels and small cards feel generic. | Worker flows need more confidence and clarity. | Three clear guide panels, mobile first, no shouty uppercase. | Polish spacing, labels, helper panels. | P0 | `ScannerStepLayout.tsx`, `ScanField.tsx` | IMPLEMENTED |
| QuantityStepper | Functional but buttons can feel chunky/inconsistent. | Quantity controls are core scanner interaction. | Consistent 44px controls, strong focus, disabled state. | Use shared control sizes and button variants. | P1 | `QuantityStepper.tsx` | PARTIAL |
| WorkflowHub | Static cards improved but still plain. | Hubs should feel intentional and premium. | Consistent card/action/status treatment. | Use shared card/action styles. | P1 | `WorkflowHub.tsx` | IMPLEMENTED |

## Page Audit

| Page | Current issue | Reference-quality target | Required fix | Priority | Files | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `Обзор` | Metrics and panels use repeated custom cards; loading/error states are inline. | Dashboard cards with consistent card/table/list spacing. | Reuse shared card/loading/error primitives and status mapping. | P1 | `src/app/wms/page.tsx` | IMPLEMENTED |
| `Задачи` | Functional task center, but card styling is custom. | Worker task center with polished cards and clear actions. | Use shared card/action/status patterns. | P0 | `src/app/wms/tasks/page.tsx` | IMPLEMENTED |
| `Товары и остатки` | Hub is clean but plain. | Clear grouped entry points. | Use improved WorkflowHub. | P1 | `src/app/wms/stock/page.tsx` | TODO |
| `Приёмка` | Large functional page; forms/cards are custom and dense. | Scanner-first receiving with polished controls, clear success/error. | Shared controls and scanner layout polish. | P0 | `src/app/wms/receiving/page.tsx` | PARTIAL |
| `Размещение` | Worker flow exists but page feels like forms and cards bolted together. | Directed put-away task screen with clear next step. | Shared scanner/card/status styles. | P0 | `src/app/wms/put-away/page.tsx` | PARTIAL |
| `Перемещения` | Select-heavy form; native select styling is weak. | Clean scanner-compatible transfer wizard. | Fix selects globally; polish form card. | P0 | `src/app/wms/transfers/page.tsx` | PARTIAL |
| `Сборка заказов` | Functional but visually busy; short-pick action is another secondary button. | Guided pick task with clear reserve/pick/short states. | Shared scanner layout, button variants, status badges. | P0 | `src/app/wms/picking/page.tsx` | PARTIAL |
| `Упаковка` | Good foundation but custom cards/messages. | Clear verification screen. | Shared NoticeBanner, cards, controls. | P0 | `src/app/wms/packing/page.tsx` | PARTIAL |
| `Инвентаризация` | Table is cramped; inline number inputs in table. | Count table with readable rows and clear actions. | Global table styles and input sizing. | P1 | `src/app/wms/cycle-counts/page.tsx` | PARTIAL |
| `Пополнение` | Operational page but cards/forms custom. | Work/rule screen with status clarity. | Shared cards, statuses, controls. | P1 | `src/app/wms/replenishment/page.tsx` | PARTIAL |
| `Склады` / `Склады и ячейки` | Dense setup forms/tables; inline text buttons. | Admin setup with clean forms, readable tables, restrained actions. | Global form/table, replace text buttons where visible. | P0 | `locations/page.tsx`, `warehouses/page.tsx` | PARTIAL |
| `Товары` | Product import and forms are functional but admin-heavy. | Clean catalog admin screen with polished import errors. | Shared controls, table styling, notice banners. | P1 | `products/page.tsx` | PARTIAL |
| `Штрихкоды` | Simple registry; likely form/select issues. | Clean label registry and export panel. | Shared controls/table. | P1 | `barcodes/page.tsx` | IMPLEMENTED |
| `Остатки` | Table can be dense; status unavailable split needs clear visual hierarchy. | Calm searchable stock table. | Global table, badges, empty/loading/error. | P1 | `inventory/page.tsx` | IMPLEMENTED |
| `История движений` | Ledger table needs readability and consistent movement labels. | Audit-quality movement history. | Global table/status styles. | P1 | `movements/page.tsx` | IMPLEMENTED |
| `Журнал` | Hub is clean but plain. | Control journal hub. | WorkflowHub polish. | P2 | `journal/page.tsx` | TODO |
| `Журнал действий` | Audit table/list may be dense. | Readable audit log with labels. | Global table/status styles. | P1 | `audit/page.tsx` | IMPLEMENTED |
| `Проверка остатков` | Reconciliation tables/cards custom. | Clear discrepancy review. | Global table/card styles. | P1 | `reconciliation/page.tsx` | IMPLEMENTED |
| `Настройки` | Very large page; many forms/selects/tables; risk of admin clutter. | Calm admin settings with consistent sections. | Shared controls/table/card; later split sections if needed. | P0 | `settings/page.tsx` | PARTIAL |
| `Доступ запрещён` | Copy is correct; card is basic. | Calm access-denied state. | Use shared card/button styles. | P1 | `AccessDenied.tsx` | IMPLEMENTED |

## Cross-Cutting Issues

| Issue | Why it matters | Fix | Priority | Status |
| --- | --- | --- | --- | --- |
| Select arrow and padding | Current selects can look raw/cramped. | Global native select styling through `.wms-control`. | P0 | IMPLEMENTED |
| Raw inline error/loading blocks | Inconsistent color/radius/spacing. | Add `LoadingState`, `ErrorState`; gradually replace. | P1 | TODO |
| Tables | Repeated raw table classes across many pages. | Global WMS table styles plus future `DataTable`. | P0 | PARTIAL |
| Badges | Binary status color is misleading. | Central visual status map. | P0 | IMPLEMENTED |
| Text buttons | Edit/deactivate actions are inconsistent. | Use ghost/danger button classes. | P1 | PARTIAL |
| Mobile scanner UI | Functional but not visually strong enough. | Improve scanner components first. | P0 | PARTIAL |
| E2E visual coverage | No Playwright runner is installed; a local Chrome screenshot smoke exists. | Keep no-dependency smoke for core pages; add full Playwright workflow E2E later. | P2 | PARTIAL |
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
