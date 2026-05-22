import { describe, expect, it } from "vitest";
import { renderBarcodeSvg } from "@/lib/barcodeRendering";

describe("barcode rendering", () => {
  it("renders Code 128 labels as SVG", () => {
    const svg = renderBarcodeSvg("LOC-A-01-01");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
  });

  it("renders QR labels as SVG for future compound labels", () => {
    const svg = renderBarcodeSvg("WMS:LOCATION:123", "qrcode");
    expect(svg).toContain("<svg");
  });

  it("returns empty output for blank labels", () => {
    expect(renderBarcodeSvg("   ")).toBe("");
  });
});
