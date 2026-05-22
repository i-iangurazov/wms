import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

const scannerPages = [
  "src/app/wms/receiving/page.tsx",
  "src/app/wms/put-away/page.tsx",
  "src/app/wms/transfers/page.tsx",
  "src/app/wms/adjustments/page.tsx",
  "src/app/wms/cycle-counts/page.tsx",
  "src/app/wms/picking/page.tsx"
];

describe("scanner flow contracts", () => {
  it.each(scannerPages)("keeps %s inside the worker scanner layout", (pagePath) => {
    const source = read(pagePath);
    expect(source).toContain("ScannerStepLayout");
    expect(source).toContain("NoticeBanner");
  });

  it("keeps the reusable scan field keyboard-scanner compatible", () => {
    const source = read("src/components/wms/ScanField.tsx");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("autoComplete=\"off\"");
    expect(source).toContain("autoCorrect=\"off\"");
    expect(source).toContain("enterKeyHint=\"done\"");
    expect(source).toContain("inputMode=\"text\"");
    expect(source).toContain("inputRef.current?.focus()");
    expect(source).toContain("aria-describedby");
  });

  it("announces worker flow errors and success messages accessibly", () => {
    const source = read("src/components/wms/NoticeBanner.tsx");
    expect(source).toContain("role={kind === \"error\" ? \"alert\" : \"status\"}");
    expect(source).toContain("aria-live={kind === \"error\" ? \"assertive\" : \"polite\"}");
  });

  it("keeps quantity entry mobile numeric and guarded against empty input", () => {
    const source = read("src/components/wms/QuantityStepper.tsx");
    expect(source).toContain("inputMode=\"numeric\"");
    expect(source).toContain("pattern=\"[0-9]*\"");
    expect(source).toContain("Number.isFinite(nextValue)");
  });

  it("keeps core scanner prompts in Russian", () => {
    const source = read("src/lib/wmsText.ts");
    expect(source).toContain("Отсканируйте ячейку");
    expect(source).toContain("Отсканируйте товар");
    expect(source).toContain("Укажите количество");
    expect(source).toContain("Проверьте количество перед подтверждением");
  });
});
