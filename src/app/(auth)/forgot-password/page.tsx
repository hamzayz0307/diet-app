"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="card p-6">
      <Logo />
      <h1 className="text-xl font-semibold mt-4 mb-4">{t.forgot_password}</h1>
      {done ? (
        <p className="text-accent text-sm">{t.reset_sent}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            type="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? t.loading : t.send_reset}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-accent underline">
          {t.back_to_login}
        </Link>
      </p>
    </div>
  );
}
