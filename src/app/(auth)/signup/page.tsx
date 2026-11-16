"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { language: lang } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is disabled, a session is returned immediately.
    if (data.session) {
      await supabase.from("profiles").update({ language: lang }).eq("id", data.session.user.id);
      router.replace("/onboarding");
      router.refresh();
    } else {
      setInfo(t.check_email);
    }
  }

  return (
    <div className="card p-6">
      <Logo />
      <h1 className="text-xl font-semibold mt-4 mb-4">{t.create_account}</h1>
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
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        {info && <p className="text-accent text-sm">{info}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? t.loading : t.signup}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {t.have_account}{" "}
        <Link href="/login" className="text-accent underline">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
