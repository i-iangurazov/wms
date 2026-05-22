import bwipjs from "bwip-js/browser";

export type BarcodeRenderKind = "code128" | "qrcode";

export function renderBarcodeSvg(value: string, kind: BarcodeRenderKind = "code128") {
  const text = value.trim();
  if (!text) {
    return "";
  }
  return bwipjs.toSVG({
    bcid: kind,
    text,
    scale: kind === "qrcode" ? 3 : 2,
    height: kind === "qrcode" ? 24 : 14,
    includetext: kind === "code128",
    textxalign: "center",
    paddingwidth: 6,
    paddingheight: 4
  });
}
