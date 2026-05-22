import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  normalizeBarcodeScan,
  parseBarcodeEntityType,
  selectBarcodeResolution,
  type BarcodeResolutionCandidate
} from "@/server/services/barcodeService";

const locationCandidate: BarcodeResolutionCandidate = {
  type: "LOCATION",
  id: "loc-1",
  label: "A-01-01",
  payload: { id: "loc-1" }
};

const productCandidate: BarcodeResolutionCandidate = {
  type: "PRODUCT",
  id: "product-1",
  label: "SKU-001",
  payload: { id: "product-1" }
};

describe("barcode service", () => {
  it("returns a single matching candidate", () => {
    expect(selectBarcodeResolution([locationCandidate])).toEqual(locationCandidate);
  });

  it("filters by expected entity type", () => {
    expect(selectBarcodeResolution([locationCandidate, productCandidate], "PRODUCT")).toEqual(productCandidate);
  });

  it("rejects missing scans", () => {
    expect(() => selectBarcodeResolution([])).toThrow(AppError);
  });

  it("rejects ambiguous scans unless the expected type disambiguates", () => {
    expect(() => selectBarcodeResolution([locationCandidate, productCandidate])).toThrow(AppError);
    expect(selectBarcodeResolution([locationCandidate, productCandidate], "LOCATION")).toEqual(locationCandidate);
  });

  it("normalizes scanner control characters without changing meaningful code text", () => {
    expect(normalizeBarcodeScan("\t LOC-A-01-01 \n")).toBe("LOC-A-01-01");
  });

  it("validates expected barcode entity type", () => {
    expect(parseBarcodeEntityType("product")).toBe("PRODUCT");
    expect(parseBarcodeEntityType(null)).toBeUndefined();
    expect(() => parseBarcodeEntityType("unknown")).toThrow(AppError);
  });
});
