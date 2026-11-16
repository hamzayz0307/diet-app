"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(t.auth_error);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="card p-6">
      <Logo />
      <h1 className="text-xl font-semibold mt-4 mb-4">{t.login}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          type="email"
          placeholder={t.email}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder={t.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? t.loading : t.login}
        </button>
      </form>
      <div className="mt-4 text-sm text-muted flex flex-col gap-2">
        <Link href="/forgot-password" className="underline">
          {t.forgot_password}
        </Link>
        <span>
          {t.no_account}{" "}
          <Link href="/signup" className="text-accent underline">
            {t.signup}
          </Link>
        </span>
      </div>
    </div>
  );
}
