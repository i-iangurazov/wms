import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

const activePageFiles = [
  "src/app/wms/page.tsx",
  "src/app/wms/tasks/page.tsx",
  "src/app/wms/products/page.tsx",
  "src/app/wms/barcodes/page.tsx",
  "src/app/wms/inventory/page.tsx",
  "src/app/wms/receiving/page.tsx",
  "src/app/wms/put-away/page.tsx",
  "src/app/wms/transfers/page.tsx",
  "src/app/wms/adjustments/page.tsx",
  "src/app/wms/picking/page.tsx",
  "src/app/wms/packing/page.tsx",
  "src/app/wms/cycle-counts/page.tsx",
  "src/app/wms/replenishment/page.tsx",
  "src/app/wms/warehouses/page.tsx",
  "src/app/wms/locations/page.tsx",
  "src/app/wms/movements/page.tsx",
  "src/app/wms/audit/page.tsx",
  "src/app/wms/reconciliation/page.tsx",
  "src/app/wms/settings/page.tsx"
];

const forbiddenScaffoldPatterns = [
  "rounded-lg border border-border bg-panel p-4 shadow-sm",
  "rounded-lg border border-border bg-panel p-5 shadow-sm",
  "overflow-hidden rounded-lg border border-border bg-panel shadow-sm",
  "rounded-md bg-red-50 p-3",
  "rounded-md bg-green-50 p-3",
  'text-sm text-muted">Загрузка'
];

function readPage(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("WMS UI design contracts", () => {
  it("keeps active WMS pages on shared page headers", () => {
    for (const page of activePageFiles) {
      expect(readPage(page), `${page} should import and render PageHeader`).toContain("PageHeader");
    }
  });

  it("does not reintroduce removed scaffold surface classes", () => {
    for (const page of activePageFiles) {
      const source = readPage(page);
      for (const pattern of forbiddenScaffoldPatterns) {
        expect(source, `${page} must not use scaffold pattern: ${pattern}`).not.toContain(pattern);
      }
    }
  });

  it("keeps active pages on the shared data table surface", () => {
    for (const page of activePageFiles) {
      const source = readPage(page);
      expect(source, `${page} must not render raw page-local tables`).not.toContain("<table");
      expect(source, `${page} must not import the legacy table wrapper class`).not.toContain("tableWrapClass");
    }
  });

  it("uses shared feedback states for page-local loading and error states", () => {
    const pagesWithClientLoading = activePageFiles.filter((page) => {
      const source = readPage(page);
      return source.includes("useEffect") && (source.includes("loading") || source.includes("!data") || source.includes("!overview"));
    });

    for (const page of pagesWithClientLoading) {
      const source = readPage(page);
      expect(source, `${page} should use shared loading/error primitives or workflow banners`).toMatch(
        /LoadingState|NoticeBanner|ErrorState/
      );
    }
  });

  it("keeps workflow navigation on real icon components instead of letter placeholders", () => {
    const source = readPage("src/components/NavItem.tsx");
    expect(source).toContain("lucide-react");
    expect(source).toContain("type LucideIcon");
    expect(source).not.toContain("label[0]");
    expect(source).not.toContain("icon: string");
  });

  it("keeps EmptyState capable of meaningful icons, descriptions, actions, and variants", () => {
    const source = readPage("src/components/EmptyState.tsx");
    expect(source).toContain("icon?: LucideIcon");
    expect(source).toContain("description?: string");
    expect(source).toContain("action?: React.ReactNode");
    expect(source).toContain("variant?: keyof typeof variants");
    expect(source).toContain("wmsEmptyStateIcons");
  });
});
