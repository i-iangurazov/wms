"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Button, Dialog, DialogContent, DialogTrigger } from "@/components/ui";

export function CameraBarcodeScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    async function startScanner() {
      setStarting(true);
      setError("");
      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current ?? undefined,
          (result, scanError, activeControls) => {
            if (cancelled) {
              return;
            }
            if (result) {
              const text = result.getText().trim();
              if (text) {
                activeControls.stop();
                controlsRef.current = null;
                setOpen(false);
                onScan(text);
              }
            } else if (scanError && scanError.name !== "NotFoundException") {
              setError("Не удалось распознать штрихкод. Попробуйте поднести камеру ближе.");
            }
          }
        );
        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError("Камера недоступна. Разрешите доступ к камере или введите код вручную.");
        }
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onScan, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 sm:min-w-32" type="button" variant="secondary">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Камера
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Сканирование камерой"
        description="Наведите камеру на штрихкод товара или ячейки. Если камера недоступна, используйте ручной ввод."
      >
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-border bg-slate-950">
            <video ref={videoRef} className="h-72 w-full object-cover" muted playsInline />
            {starting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-semibold text-white">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Включаем камеру...
              </div>
            ) : null}
          </div>
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
