type NoticeKind = "success" | "error" | "info";

const classes: Record<NoticeKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-danger",
  info: "border-sky-200 bg-sky-50 text-sky-800"
};

export function NoticeBanner({ kind, message }: { kind: NoticeKind; message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`mb-4 rounded-md border p-3 text-sm ${classes[kind]}`}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
    >
      {message}
    </div>
  );
}
