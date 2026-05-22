import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const controlClass =
  "wms-control focus-ring w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-24 resize-y leading-6 ${className}`} {...props} />;
}
