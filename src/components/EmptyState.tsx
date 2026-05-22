export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-panel p-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
