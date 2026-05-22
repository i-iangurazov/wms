export function TableWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-x-auto rounded-lg border border-border bg-panel shadow-sm ${className}`}>{children}</div>;
}

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <table className={`w-full text-left text-sm ${className}`}>{children}</table>;
}
