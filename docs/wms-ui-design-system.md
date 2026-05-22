# WMS UI Design System

Status legend:

- `IMPLEMENTED`: available in shared components or global WMS styles.
- `PARTIAL`: usable but not applied everywhere or missing tests/E2E.
- `GAP`: required before UI can be called production-polished.

This document defines the standalone WMS visual and interaction system. It is the control document for UI work. The target is a serious Russian-first SaaS product for warehouse workers, warehouse managers, admins, and viewers.

## 1. Visual Principles

- Clean SaaS admin interface: restrained surfaces, clear hierarchy, dense enough for operations but not cramped.
- Calm neutral palette: light neutral background, white panels, dark readable text, one primary accent, semantic status colors only.
- Strong readability: 14px body minimum, 16px scanner/input text where workers type or scan, no negative letter spacing.
- Consistent spacing: 8px base rhythm; page sections use 24px gaps; form controls use 40-44px height; worker scan controls use 44-48px height.
- Restrained badges: subtle background and border, no random bright colors.
- Clear hierarchy: one page title, concise description, section headings inside cards, actions in predictable footer/right areas.
- No visual noise: no decorative gradients, no bokeh/orbs, no toy-like colors, no excessive shadow.
- No cramped controls: selects must have right padding, values must not collide with arrows, buttons must not collapse Russian labels.
- Mobile/scanner-friendly flows: one-column layout, large scan fields, single primary action, clear next step.

## 2. Layout System

| Area | Rule | Current status |
| --- | --- | --- |
| Page shell | Sidebar on desktop, sticky top bar on mobile, max content width `7xl`, 24px desktop padding. | PARTIAL |
| Page spacing | Page header then 24px section rhythm. | PARTIAL |
| Cards | 8px radius, 1px neutral border, white surface, subtle shadow only. | PARTIAL |
| Tables | 44px+ rows, readable header, horizontal overflow, clear empty state. | PARTIAL |
| Forms | Labels above controls, 12-16px control gaps, controls 40px+ height. | PARTIAL |
| Section headers | Short Russian title plus optional muted description. | PARTIAL |
| Sidebar | Workflow-first navigation with icon, label, active/hover state, role visibility. | PARTIAL |
| Mobile nav | Horizontal scroll with same labels/icons; no hidden critical nav. | PARTIAL |
| Scanner layout | Instruction, scan target, result, large focused input, mobile one-column. | PARTIAL |
| Sticky actions | Required for long worker flows but not implemented yet. | GAP |

## 3. Component Quality Standards

### Button

- Variants: `primary`, `secondary`, `ghost`, `danger`.
- Required states: hover, active, disabled, loading-ready spacing.
- Height: 40px normal, 44px scanner/action contexts.
- Labels: Russian text must not overflow; use `inline-flex`, `gap-2`, `min-w` where needed.
- Status: PARTIAL via `buttonClass`, `secondaryButtonClass`, `ghostButtonClass`, `dangerButtonClass`.

### Input

- Label is required for forms.
- Placeholder is optional and must be useful.
- Helper/error text must be short and Russian.
- Disabled state must be visible.
- Focus ring must be clear and accessible.
- Height must be consistent across input/select/textarea.
- Status: PARTIAL via `inputClass`.

### Select

- Must not look like raw browser default.
- Must have proper right padding and a visible arrow that does not overlap text.
- Height must match inputs.
- Focus, error, disabled states must exist.
- Options must remain readable through native OS menu.
- Russian labels must fit.
- Current strategy: native select with WMS control class, custom arrow styling through global CSS. If it becomes insufficient, create an accessible custom select.
- Status: IMPLEMENTED foundation.

### Textarea

- Same visual language as input.
- Minimum height 96px.
- Resize vertical only.
- Status: PARTIAL via `textareaClass`.

### Badge

- Visual types: `neutral`, `info`, `success`, `warning`, `danger`, `blocked`, `progress`.
- No page-specific random colors.
- Raw enum values must go through Russian label maps.
- Status: IMPLEMENTED foundation in `StatusBadge`.

### Table

- Header: muted, readable, no tiny hard-to-read uppercase dependency.
- Rows: 44px+ height, neutral hover, strong first column where useful.
- Empty/loading/error states must be outside the table or inside a full-width row.
- Responsive fallback: horizontal scroll today; card/mobile table views are future polish.
- Status: PARTIAL via global `.wms-root table` styles.

### Card

- Border, radius, padding, optional footer.
- Shadow is subtle and consistent.
- Avoid nested cards except repeated items inside workflow sections.
- Status: PARTIAL via `cardClass` and global surface styles.

### Modal

- Clear title, description, action footer, destructive confirmation, mobile-safe max height.
- Status: GAP. Active screens currently avoid true modal patterns.

### Scanner Step Component

- Large scan field.
- Clear instruction.
- Current step and next action.
- Success/error feedback.
- Duplicate-submit protection must exist in workflow command.
- Mobile-first layout.
- Status: PARTIAL via `ScannerStepLayout`, `ScanField`, and command idempotency.

## 4. Russian UX Copy Rules

- Labels are short and human: `Склад`, `Ячейка`, `Товар`, `Количество`, `Статус`.
- No raw enum values in active WMS UI.
- No mixed English/Russian for user-facing instructions.
- Action buttons say what happens: `Принять товар`, `Разместить`, `Собрать`, `Подтвердить пересчёт`, `Заблокировать товар`.
- Errors explain what to do: `Недостаточно товара в этой ячейке`, `Отсканирован другой товар`, `У вас нет прав на это действие`, `Количество должно быть больше нуля`.
- Technical terms are allowed only in admin/audit docs when unavoidable.

## 5. Status Design System

| Visual type | Use | Classes |
| --- | --- | --- |
| neutral | draft, inactive, cancelled, default | gray border/background |
| info | allocated, received, packed, ready | blue border/background |
| success | completed, approved, active | green border/background |
| warning | pending approval, discrepancy, short | amber border/background |
| danger | lost, failed, destructive | red border/background |
| blocked | blocked, unavailable, damaged | slate/red restrained |
| progress | open, receiving, counting, picking, in progress | teal border/background |

Status mapping is centralized in `StatusBadge`. New statuses must be added there instead of page-level colors.

## 6. Navigation Redesign Rules

Primary navigation:

- `Обзор`
- `Задачи`
- `Товары и остатки`
- `Приёмка`
- `Сборка и упаковка`
- `Инвентаризация`
- `Пополнение`
- `Склады`
- `Журнал`
- `Настройки`

Rules:

- Every item has a simple icon, short Russian label, active state, role visibility, and mobile behavior.
- Workers start from `Задачи`, not database tables.
- Managers use `Обзор`, `Задачи`, `Журнал`, and setup sections.
- Admin setup is separated from daily operations.
- Status: PARTIAL. Role visibility exists; active state and icons are being hardened.

## 7. Implementation Roadmap

### UI-1: Design Documentation And Audit

- Goal: define quality target and identify exact code gaps.
- Files: `docs/wms-ui-design-system.md`, `docs/wms-ui-audit.md`.
- Validation: docs plus `git diff --check`.
- Status: IMPLEMENTED. `docs/wms-ui-design-system.md` and `docs/wms-ui-audit.md` now define the product-quality control documents.

### UI-2: Shared Primitive Hardening

- Goal: make the common UI primitives production-looking.
- Files: `src/components/FormControls.tsx`, `src/components/StatusBadge.tsx`, `src/components/PageHeader.tsx`, `src/components/EmptyState.tsx`, `src/components/AppShell.tsx`, `src/app/globals.css`, scanner components.
- Validation: typecheck, lint, tests, build.
- Status: IMPLEMENTED at shared primitive level. Shared form controls, select styling, buttons, badges, page headers, empty states, notice banners, scanner panels, workflow hubs, and WMS table defaults have been hardened. Remaining work moves to UI-3: full active-page replacement of inline loading/error/card patterns and browser/mobile visual QA.

### UI-3: Active Page Consistency Pass

- Goal: remove scaffold-like custom styling from active WMS screens.
- Files: active pages under `src/app/wms/**`.
- Validation: typecheck, lint, tests, build; manual visual review.

### UI-4: Worker Flow Polish

- Goal: make receiving, put-away, transfer, picking, packing, cycle count scanner flows mobile-friendly and calm.
- Files: scanner components and worker pages.
- Validation: component contract tests and build; E2E remains a documented gap if not added.

### UI-5: Final Visual Review

- Goal: verify no raw enum labels, ugly selects, cramped tables, missing empty/loading/error states, or inconsistent badges remain on active screens.
- Files: docs and fixes from review.
- Validation: full validation gate.
