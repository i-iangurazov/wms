"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "@/components/FormControls";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "admin@example.com", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось войти.");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next || "/wms");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 text-ink">
      <section className="w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Вход в WMS</h1>
          <p className="mt-1 text-sm text-muted">Войдите, чтобы работать со складами, остатками и заданиями.</p>
        </div>
        {error ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email"
              type="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Пароль</span>
            <input
              className={inputClass}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
              type="password"
            />
          </label>
          <button className={`${buttonClass} h-11 w-full`} disabled={loading} type="submit">
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Для демо после seed используйте admin@example.com и пароль из `SEED_ADMIN_PASSWORD`.
        </p>
      </section>
    </main>
  );
}
