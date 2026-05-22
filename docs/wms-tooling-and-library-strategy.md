# WMS Tooling And Library Strategy

Status: `PARTIAL / ACTIVE IMPLEMENTATION`

This document defines the practical library stack for the standalone WMS. It is based on the current repository state and public WMS/tooling references. The rule is simple: use mature libraries where they reduce operational risk, but keep stock mutation, permissions, tenant isolation, and audit rules in our own backend services.

## 1. WMS Reference Systems

| Reference | Concepts to learn from | Relevant modules | Useful UX/workflow patterns | What not to copy | Mapping in this WMS |
| --- | --- | --- | --- | --- | --- |
| Great Blue / Open WMS (`https://github.com/infiniteoo/wms`) | Open-source warehouse-in-a-box approach, web plus mobile split, Postgres-backed operations, SaaS auth. | Products, receiving, orders, mobile app, warehouse tasks. | Treat mobile/scanner work as a first-class surface, not an afterthought. | Do not copy stack choices wholesale; this repo stays Next.js/Prisma/Postgres with our own Russian UX. | Keep workflow-first WMS pages and grow E2E around worker tasks. |
| ModernWMS (`https://github.com/fjykTec/ModernWMS`) | SMB-oriented WMS breadth: goods, owners, locations, stock, in/out flows, reports. | Goods, warehouse setup, stock in/out, reports. | Simple operational menus and direct inventory documents. | Do not copy UI or broad ERP-like screens; avoid overloading workers. | Use as a reminder that SMB WMS needs setup, stock documents, and reports, but keep worker screens guided. |
| OpenWMS.org (`https://openwms.github.io/org.openwms/`) | Extensible WMS/WCS split, domain services, integration boundaries. | WMS domain, transport/control systems, connectors. | Strong modular boundaries between operational domain and external automation. | No WCS, PLC, robotics, or distributed microservice architecture in MVP. | Keep service boundaries clean; future automation integrates through services, not UI shortcuts. |
| Odoo Inventory/Barcode (`https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/barcode.html`) | Barcode-first operations, operation commands, product/location barcodes, receipts, delivery, internal transfers. | Barcode app, inventory locations, receipts/deliveries, operation barcodes. | One scan field at a time, product/location barcode setup, print physical labels. | Do not copy enterprise route/settings complexity into worker screens. | `ScanField`, `BarcodeService`, label registry, product/location labels, guided flows. |
| ERPNext stock/warehouse (`https://docs.frappe.io/erpnext/user/manual/en/stock-entry`, `https://docs.frappe.io/erpnext/v13/user/manual/en/stock/stock-reconciliation`) | Stock Entry, Material Receipt/Issue/Transfer, Stock Ledger, Stock Reconciliation. | Stock entries, stock ledger, reconciliation, imports. | Every stock change has a submitted document and visible ledger result. | Do not copy accounting/valuation complexity in MVP. | Stock changes go through `StockMovementService`; reconciliation stays a first-class admin check. |

## 2. Barcode Scanning

| Tool | Fit | Strengths | Weaknesses | Decision |
| --- | --- | --- | --- | --- |
| `@zxing/browser` | Strong fit now. | Browser camera scanning, 1D/2D formats through ZXing, no paid SDK, works with manual fallback. | Camera scanning is slower than hardware scanners and depends on browser camera permissions. | `SELECTED NOW` for camera scanning. Implemented in `CameraBarcodeScanner` and wired into `ScanField`. |
| Quagga2 (`https://ericblade.github.io/quagga2/`) | Useful for 1D-only camera scanning. | Real-time localization, mature continuation of QuaggaJS. | Narrower barcode format coverage; less attractive if QR/DataMatrix is needed later. | `DEFERRED`; use only if ZXing performs poorly for Code 128/EAN camera scanning. |
| STRICH / Scanbot SDK | Commercial fallback. | Better industrial scanning, support, mobile robustness. | Paid vendor dependency and product/legal decision required. | `FUTURE`; evaluate only after real-device camera scan testing shows open-source scanner is not enough. |

Current implementation:

- Keyboard scanner support remains the default because hardware scanners behave like fast keyboards.
- Camera scanner support is added through `src/components/wms/CameraBarcodeScanner.tsx` and lazy-loaded from `ScanField` so worker pages do not pay the camera-scanner bundle cost until the user opens camera scanning.
- Manual input remains available in every `ScanField`.
- Scanner flows still need device testing with real handheld scanners and mobile cameras.

## 3. Barcode And Label Generation

| Tool | Fit | Strengths | Weaknesses | Decision |
| --- | --- | --- | --- | --- |
| `bwip-js` (`https://www.npmjs.com/package/bwip-js`) | Strong fit now. | Generates SVG/PNG/canvas barcodes, supports Code 128, QR, DataMatrix, GS1-like symbologies. | SVG output needs controlled rendering. | `SELECTED NOW` for product/location/receiving label rendering. |
| `jsbarcode` | Good for simple 1D labels. | Small, common Code 128/EAN rendering. | No broad 2D/GS1 coverage. | `NOT SELECTED`; `bwip-js` covers more WMS label formats. |
| `qrcode` | Good for QR-only labels. | Simple QR generation. | Does not cover Code 128/product labels. | `DEFERRED`; `bwip-js` already covers QR for now. |
| `react-to-print` | Good for React print areas. | Ergonomic component printing. | Extra dependency not needed for current label sheet. | `DEFERRED`; current print uses browser print CSS and rendered SVG labels. |
| `pdf-lib` / `@react-pdf/renderer` | Good for generated PDFs. | Portable label sheets and downloadable documents. | More layout work; not required for first label-print foundation. | `FUTURE`; add when PDF label layouts must be stable across printers. |

Current implementation:

- `src/lib/barcodeRendering.ts` renders Code 128 and QR SVG using `bwip-js`.
- `src/components/wms/BarcodeSymbol.tsx` displays rendered labels.
- `/wms/barcodes` shows barcode previews and prints a label sheet.
- CSV export remains available for external label tools.

Decision:

- Product labels: Code 128 via `bwip-js`.
- Location labels: Code 128 via `bwip-js`.
- Receiving labels: use the same renderer when receiving-line labels are added.
- PDF/export/print: browser print label sheet now; PDF generation later if printer consistency requires it.

## 4. Import And Export

| Tool | Fit | Strengths | Weaknesses | Decision |
| --- | --- | --- | --- | --- |
| `papaparse` | Strong CSV fit. | Robust client CSV parsing and preview. | CSV only. | `SELECTED / IN USE` for CSV preview. |
| `xlsx` | Good client import fit. | Reads XLSX into rows in-browser. | Bundle size; template generation is weaker than ExcelJS. | `SELECTED / IN USE` for XLSX import preview. |
| `exceljs` (`https://www.npmjs.com/package/exceljs`) | Strong template/export fit. | Creates styled XLSX templates server-side. | Larger dependency; keep it server-side. | `SELECTED NOW` for downloadable import templates. |

Current implementation:

- Product import accepts CSV/XLSX on `/wms/products`.
- Product import preview reports columns, row count, and errors before submission.
- New endpoint: `/api/products/import/template` generates `wms-product-import-template.xlsx` with ExcelJS.

Decisions:

- Product import: CSV/XLSX.
- Barcode import: use product import `barcodes` and `variant_barcodes` columns now; standalone barcode import later.
- Initial stock import: future reconciliation/opening-stock flow, not product import.
- Error preview: required before commit.
- Downloadable templates: ExcelJS server route.

## 5. Tables And Grids

Decision: `@tanstack/react-table` remains the table foundation.

Use it for:

- products
- stock
- movement history
- tasks
- receiving sessions/lines where table density is appropriate
- users
- audit logs

Current implementation:

- `src/components/ui/DataTable.tsx` is TanStack-backed with responsive rows, sorting metadata, pagination, and row actions through `ActionMenu`.

Next gaps:

- Add column filters where datasets are large.
- Add bulk actions only where operationally safe.
- Keep worker scanner screens card/wizard-first instead of forcing tables.

## 6. Forms And Validation

Decision: `react-hook-form`, `zod`, and `@hookform/resolvers` are the standard for new and migrated forms.

Current implementation:

- Shared schemas: `src/lib/wmsSchemas.ts`.
- Server parser: `src/server/validation.ts`.
- Product and warehouse forms use React Hook Form + Zod.
- Product/warehouse API routes validate through shared schemas.

Rules:

- UI schemas catch simple shape/required errors.
- Services remain authoritative for permissions, tenant isolation, stock rules, and business invariants.
- Russian validation messages are required.

Next gaps:

- Migrate locations, receiving, put-away, transfers, adjustments, cycle counts, picking, packing, users, settings.

## 7. Workflow And State Machines

| Tool | Fit | Decision |
| --- | --- | --- |
| `xstate` (`https://xstate.js.org/`) | Useful when scanner workflows grow into complex branching machines with retry, exception, partial, and approval states. | `DEFERRED`. Current backend statuses and service guards are explicit enough. Add XState only for receiving/picking/packing UI state if branching becomes hard to test with plain React state. |

Reason:

- The current WMS has real persisted statuses in Prisma and service rules. Adding XState now would duplicate state logic before the workflows are fully hardened.
- Model-based tests may be valuable later for scanner failure paths.

## 8. Background Jobs

| Tool | Fit | Decision |
| --- | --- | --- |
| BullMQ (`https://docs.bullmq.io/`) | Strong if we accept Redis. Good for import/export, reconciliation, replenishment. | `FUTURE` when Redis is introduced. |
| Inngest (`https://www.inngest.com/docs/guides/background-jobs`) | Good durable jobs without managing queues, especially serverless. | `FUTURE PRODUCT/DEPLOYMENT DECISION`; external service dependency. |
| Trigger.dev (`https://trigger.dev/docs`) | Good managed/self-hosted workflow jobs and observability. | `FUTURE PRODUCT/DEPLOYMENT DECISION`; external service dependency. |
| Simple cron/scripts | Best MVP fit. | `SELECTED NOW` for reconciliation and manual scheduled commands. |

Current implementation:

- Reconciliation exists as service/API/UI.
- No queue worker is required for the current MVP.

Next gaps:

- Add a documented scheduled reconciliation command.
- Add manual replenishment generation first; background scheduling later.
- Add import job table only when imports become large enough to exceed request-time processing.

## 9. Auth And Security

| Tool | Fit | Decision |
| --- | --- | --- |
| Auth.js / NextAuth (`https://authjs.dev/`) | Good for OAuth/provider-heavy auth. | `DEFERRED`; current password/org model is already service-integrated. |
| Lucia-style custom auth | Good for full control. | `SELECTED CURRENT STRATEGY`; implemented as custom email/password, secure cookie sessions, org context, RBAC. |
| Clerk (`https://clerk.com/docs/nextjs/guides/organizations/getting-started`) | Strong org/user management. | `FUTURE COMMERCIAL OPTION`; would replace custom user/org UX. |
| Supabase Auth (`https://supabase.com/docs/guides/auth/`) | Strong if Supabase/RLS is adopted. | `NOT SELECTED`; this repo uses Prisma/Postgres directly. |

Current implementation:

- Email/password login.
- Secure session cookies.
- Organization context in session.
- Role/permission model with server-side checks.
- Login rate limiting.

Next gaps:

- Password reset/invite activation.
- Session rotation audits.
- More route-level permission matrix tests.

## 10. Observability

| Tool | Fit | Decision |
| --- | --- | --- |
| `pino` (`https://github.com/pinojs/pino`) | Strong fit for low-overhead structured server logs. | `SELECTED NOW`; installed and used for unexpected API errors. |
| Sentry (`https://docs.sentry.io/platforms/javascript/guides/nextjs/`) | Strong production error tracking. | `FUTURE`; requires DSN/secrets and deployment decision. |

Current implementation:

- `src/server/logger.ts` provides structured JSON logs with password redaction.
- `jsonError` logs unexpected server errors through Pino.
- Audit logs remain business/security history; Pino logs are system diagnostics.

Next gaps:

- Add request IDs.
- Add structured logs around import/reconciliation failures.
- Add Sentry only when production DSN is available.

## 11. E2E Testing

Decision: `@playwright/test` remains the browser workflow test foundation.

Relevant Playwright strengths from documentation (`https://playwright.dev/`):

- auto-waiting assertions
- isolated browser contexts
- desktop/mobile projects
- user-facing locators
- traces/screenshots for failures

Current implementation:

- Desktop/mobile tests cover login, protected routing, navigation icons, product/warehouse creation, API-backed warehouse workflow verification, and Russian access-denied state.

Required next E2E workflows:

- camera scanner fallback presence
- receive through click-through UI
- put-away through click-through UI
- transfer through click-through UI
- pick/pack through click-through UI
- product import template download and CSV/XLSX preview
- barcode label creation and print-sheet presence

## Selected Stack Summary

Implemented in this pass:

- `@zxing/browser`: camera barcode scanning from shared scan field.
- `bwip-js`: SVG barcode/QR rendering for label previews and print sheets.
- `exceljs`: server-generated product import XLSX template.
- `pino`: structured server logging for unexpected API errors.

Already selected and in use:

- `lucide-react`
- Radix primitives
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `@tanstack/react-table`
- `@tanstack/react-query`
- `sonner`
- `date-fns`
- `papaparse`
- `xlsx`
- `@playwright/test`

Deferred deliberately:

- XState until workflow UI branching needs statecharts.
- BullMQ/Inngest/Trigger.dev until jobs require durable workers or external scheduling.
- Sentry until production DSN and deployment target exist.
- Commercial scanner SDKs until real-device testing proves open-source scanning is insufficient.
- PDF label generation until browser print is not stable enough for operations.

## Acceptance Criteria For This Strategy Phase

- Strategy document exists and maps choices to current repo files.
- Selected libraries are present in `package.json`.
- Camera scanning is available from shared scanner fields.
- Barcode labels render with a real barcode library.
- Barcode label print/export foundation exists.
- Product import has an XLSX template generated by a mature library.
- Unexpected API errors use structured logs.
- Typecheck, lint, unit tests, DB smoke, build, UI smoke, and E2E pass.

Validation result for this phase:

- `git diff --check`: passed
- `pnpm typecheck`: passed
- `pnpm lint`: passed
- `pnpm test`: passed, 107 tests
- `pnpm test:db`: passed
- `pnpm build`: passed
- `pnpm ui:smoke`: passed
- `pnpm test:e2e`: passed, 10 browser tests
