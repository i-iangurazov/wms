export function LoadingState({ message = "Загрузка..." }: { message?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-5 text-sm text-muted shadow-sm" role="status">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-danger" role="alert">
      {message}
    </div>
  );
}
