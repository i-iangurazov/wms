"use client";

import { useMemo } from "react";
import { renderBarcodeSvg, type BarcodeRenderKind } from "@/lib/barcodeRendering";

export function BarcodeSymbol({
  value,
  kind = "code128",
  className = ""
}: {
  value: string;
  kind?: BarcodeRenderKind;
  className?: string;
}) {
  const svg = useMemo(() => {
    try {
      return renderBarcodeSvg(value, kind);
    } catch {
      return "";
    }
  }, [kind, value]);

  if (!svg) {
    return <span className="font-mono text-xs text-muted">{value}</span>;
  }

  return (
    <div
      className={`max-w-full overflow-hidden [&_svg]:h-auto [&_svg]:max-w-full ${className}`}
      aria-label={`Штрихкод ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
