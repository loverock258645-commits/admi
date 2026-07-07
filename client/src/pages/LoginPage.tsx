import { FormEvent, useState } from "react";
import { apiRequest } from "../api";

type LoginPageProps = {
  onLogin: () => Promise<void>;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setPassword("");
      await onLogin();
    } catch {
      setError("帳號或密碼錯誤。");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-clinical-line bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-clinical-teal">
            安全登入
          </p>
          <h1 className="text-2xl font-semibold tracking-normal text-clinical-ink">
            醫院病歷摘要工具
          </h1>
          <p className="mt-3 text-sm text-clinical-muted">
            本工具僅限授權使用者使用
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-clinical-ink">
              帳號
            </span>
            <input
              className="w-full rounded-md border border-clinical-line px-3 py-3 text-base outline-none transition focus:border-clinical-teal focus:ring-2 focus:ring-clinical-teal/15"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-clinical-ink">
              密碼
            </span>
            <input
              className="w-full rounded-md border border-clinical-line px-3 py-3 text-base outline-none transition focus:border-clinical-teal focus:ring-2 focus:ring-clinical-teal/15"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-clinical-teal px-4 py-3 text-base font-semibold text-white transition hover:bg-clinical-tealDark disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "登入中..." : "登入"}
          </button>
        </form>
      </section>
    </main>
  );
}
