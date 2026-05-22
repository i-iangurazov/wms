# WMS Library Adoption Plan

## Current Verdict

The standalone WMS no longer has an empty dependency surface, but library adoption is still `PARTIAL`. The product now uses mature UI, table, icon, import, notification, validation, and E2E libraries in working screens. The remaining risk is uneven migration: not every workflow form has moved to shared schemas, React Hook Form, React Query mutations, or full click-through Playwright coverage.

## Library Matrix

| Area | Previous gap | Chosen library | Why needed | Current use | Status |
| --- | --- | --- | --- | --- | --- |
| Icons | Fake letter nav icons and decorative empty states. | `lucide-react` | Clear workflow navigation and meaningful empty/action states. | Navigation, dashboard, empty states, action menus, dialogs. | IMPLEMENTED |
| Select/Dialog/Menu/Tabs/Popover/Tooltip | Browser-default controls and no accessible primitives. | Radix Select, Dialog, Dropdown Menu, Tabs, Popover, Tooltip | Accessible keyboard behavior, polished triggers/content, composable SaaS primitives. | Shared `Select`, `Dialog`, `Dropdown`, `Tabs`, `Tooltip`, `ActionMenu`. | PARTIAL |
| Forms | Manual `useState` forms with duplicated validation. | `react-hook-form` | Stable form state, field errors, lower rerender cost. | `Товары`, `Склады` forms. | PARTIAL |
| Validation | API and UI validation not consistently shared. | `zod`, `@hookform/resolvers` | One schema can validate UI and API payloads. | `src/lib/wmsSchemas.ts`, product/warehouse API routes, product/warehouse forms. | PARTIAL |
| Tables | Repeated raw tables without sorting/pagination conventions. | `@tanstack/react-table` | Sorting, pagination, row models, consistent responsive rendering. | Shared `DataTable` across active table pages. | IMPLEMENTED foundation |
| Server state | Manual fetch/loading/mutation state. | `@tanstack/react-query` | Query cache, mutation state, invalidation, consistent refetch. | `Товары`, `Склады`; provider in root layout. | PARTIAL |
| Notifications | Inline success/error messages only. | `sonner` | Russian toast feedback for successful and failed operations. | Root `Toaster`, product/warehouse mutations. | PARTIAL |
| Dates | Raw `toLocaleString()` varied by browser. | `date-fns` with Russian locale | Consistent Russian-friendly timestamps. | Movement history and audit log. | PARTIAL |
| Product import | CSV text only, no preview/XLSX. | `papaparse`, `xlsx` | CSV/XLSX parsing, preview, import validation feedback. | Product import UI parses CSV/XLSX, previews rows/columns, sends normalized CSV. | PARTIAL |
| Import templates | No downloadable import templates. | `exceljs` | Server-side XLSX template generation with headers/examples. | `/api/products/import/template`. | IMPLEMENTED foundation |
| Camera scanning | Keyboard/manual scanner only. | `@zxing/browser` | Browser camera scanning for mobile fallback. | Shared `CameraBarcodeScanner` inside `ScanField`. | PARTIAL |
| Label rendering | CSV export only; no real label preview/print. | `bwip-js` | Code 128/QR SVG rendering for product/location labels. | `BarcodeSymbol` and `/wms/barcodes` print sheet. | PARTIAL |
| Observability | Unexpected errors used `console.error`. | `pino` | Structured JSON logs with redaction. | `src/server/logger.ts`, `jsonError`. | PARTIAL |
| E2E | Screenshot smoke only. | `@playwright/test` | Browser workflow verification on desktop/mobile. | Login, access, product/warehouse creation, API-backed receive/put-away/transfer/cycle-count/pick/pack checks. | PARTIAL |

## Shared Components And Files

- Providers: `src/components/AppProviders.tsx`
- API client: `src/lib/apiClient.ts`
- Shared schemas: `src/lib/wmsSchemas.ts`
- Server schema helper: `src/server/validation.ts`
- Date formatting: `src/lib/dateFormat.ts`
- UI primitives: `src/components/ui/*`
- Product import UI: `src/app/wms/products/page.tsx`
- Warehouse form migration: `src/app/wms/warehouses/page.tsx`
- API schema adoption: `src/app/api/products/**`, `src/app/api/warehouses/**`
- E2E: `playwright.config.ts`, `e2e/wms-operational-ui.spec.ts`

## Migration Plan

### Implemented In This Pass

- Added missing dependencies: `@radix-ui/react-tooltip`, `@hookform/resolvers`, `@tanstack/react-query`, `@types/papaparse`.
- Added root `QueryClientProvider` and `sonner` toaster.
- Added shared API client for typed JSON responses and Russian error propagation.
- Added shared Zod schemas for product, variant, warehouse, location, receiving, transfer, adjustment, cycle count, picking, users, and roles.
- Migrated product and warehouse forms to React Hook Form plus Zod resolver.
- Migrated product and warehouse mutations to React Query with cache invalidation and Russian toasts.
- Migrated product/warehouse API routes to parse shared Zod schemas.
- Added CSV/XLSX product import preview with row/column validation before submission.
- Added Russian date-fns timestamp formatting to movement history and audit logs.
- Added Radix Tooltip primitive and wired it into navigation icons.
- Extended shared `DataTable` with sortable headers and pagination support.
- Added `docs/wms-tooling-and-library-strategy.md`.
- Added `@zxing/browser`, `bwip-js`, `exceljs`, and `pino`.
- Added camera barcode scanning to the shared scanner field.
- Added real barcode SVG rendering and printable label sheets to `/wms/barcodes`.
- Added an ExcelJS-generated product import XLSX template endpoint.
- Replaced unexpected API `console.error` logging with structured Pino logs.

### Next Migration Slices

1. Move location, receiving, transfer, adjustment, cycle count, picking, users, and settings forms to React Hook Form + Zod schemas.
2. Move interactive worker pages to React Query mutations where duplicate submit/loading state matters most.
3. Add table column sorting metadata to remaining DataTable pages.
4. Add import result preview tests for CSV and XLSX.
5. Expand Playwright from API-backed workflow checks to full click-through scanner workflows.
6. Replace remaining inline success/error banners with Sonner where transient feedback is better, while keeping persistent validation errors in the page.

## Risks

- Dependency surface increased; validation must run after every migration.
- React Query cache keys must stay tenant-safe and must not leak data across authenticated organization context changes.
- Zod schemas must not weaken server-side business rules; services remain the final authority.
- XLSX parsing increases client bundle for the product page; acceptable for MVP import, but can be lazy-loaded later if needed.
- Toasts must not replace visible field-level validation on critical warehouse actions.
- Playwright still has limited scanner click-through coverage.

## Acceptance Criteria

- Required libraries are installed and used in active code, not only listed in `package.json`.
- WMS navigation and empty states use real icons.
- Active selects use Radix Select.
- Product and warehouse forms use React Hook Form and shared Zod schemas.
- Product and warehouse API routes validate with shared schemas.
- Active tables use TanStack DataTable with sorting/pagination support.
- Product import accepts CSV and XLSX with preview and error rows.
- Movement/audit dates use consistent Russian date formatting.
- Russian Sonner notifications appear for product and warehouse mutations.
- Playwright E2E remains present and passing.
- Typecheck, lint, unit tests, DB smoke, build, UI smoke, and E2E pass.

## Validation Result

Passed in this adoption phase:

- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:db`
- `pnpm build`
- `pnpm ui:smoke`
- `pnpm test:e2e`

## Current Status

`PARTIAL`: the foundation is real, active, and validated, but full WMS product hardening requires continuing the migration across every operational workflow form and scanner flow.
