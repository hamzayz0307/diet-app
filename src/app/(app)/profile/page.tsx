"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { createClient } from "@/lib/supabase/client";
import LangSwitch from "@/components/LangSwitch";
import MacroRow from "@/components/MacroRow";

export default function ProfilePage() {
  const { t } = useT();
  const { profile, update } = useProfile();
  const router = useRouter();

  const [editTargets, setEditTargets] = useState(false);
  const [kcal, setKcal] = useState(String(profile.calorie_target ?? ""));
  const [protein, setProtein] = useState(String(profile.protein_g ?? ""));
  const [carbs, setCarbs] = useState(String(profile.carbs_g ?? ""));
  const [fat, setFat] = useState(String(profile.fat_g ?? ""));
  const [water, setWater] = useState(String(profile.water_target_ml));
  const [name, setName] = useState(profile.display_name ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState(false);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1800);
  }

  async function saveTargets() {
    setBusy(true);
    try {
      await update({
        calorie_target: Number(kcal) || profile.calorie_target,
        protein_g: Number(protein) || profile.protein_g,
        carbs_g: Number(carbs) || profile.carbs_g,
        fat_g: Number(fat) || profile.fat_g,
        water_target_ml: Number(water) || profile.water_target_ml,
      });
      setEditTargets(false);
      flash(t.saved);
    } catch {
      flash(t.error_generic);
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    await update({ display_name: name.trim() || null }).catch(() => {});
    flash(t.saved);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function deleteAccount() {
    const word = t.delete_account_confirm.includes("SİL") ? "SİL" : "DELETE";
    if (confirmDelete !== word) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      flash(t.error_generic);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/signup");
    router.refresh();
  }

  return (
    <main className="px-5 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.profile}</h1>
        <LangSwitch onChange={(l) => update({ language: l }).catch(() => {})} />
      </div>

      <section className="card p-4 space-y-3">
        <label className="block">
          <span className="block text-xs text-muted mb-1">{t.display_name}</span>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-ghost" onClick={saveName}>{t.save}</button>
          </div>
        </label>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Info label={t.height_cm} value={profile.height_cm ?? "—"} />
          <Info label={t.weight_kg} value={profile.weight_kg ?? "—"} />
          <Info label={t.goal} value={profile.goal ? t[`goal_${profile.goal}` as const] : "—"} />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{t.targets}</h2>
          <button className="text-accent text-sm" onClick={() => setEditTargets((v) => !v)}>
            {editTargets ? t.cancel : t.edit}
          </button>
        </div>

        {!editTargets ? (
          <>
            <p className="text-3xl font-semibold">
              {profile.calorie_target ?? "—"} <span className="text-base text-muted">kcal</span>
            </p>
            <div className="mt-3">
              <MacroRow
                protein={profile.protein_g ?? 0}
                carbs={profile.carbs_g ?? 0}
                fat={profile.fat_g ?? 0}
              />
            </div>
            <p className="text-xs text-muted mt-3">
              {t.water}: {profile.water_target_ml} ml
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="kcal"><input className="input" type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} /></Field>
              <Field label={`${t.protein} (g)`}><input className="input" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} /></Field>
              <Field label={`${t.carbs} (g)`}><input className="input" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></Field>
              <Field label={`${t.fat} (g)`}><input className="input" type="number" value={fat} onChange={(e) => setFat(e.target.value)} /></Field>
            </div>
            <Field label={t.water_target}><input className="input" type="number" step="250" value={water} onChange={(e) => setWater(e.target.value)} /></Field>
            <button className="btn btn-primary w-full" onClick={saveTargets} disabled={busy}>{t.save}</button>
          </div>
        )}

        <Link href="/onboarding" className="btn btn-ghost w-full mt-3 text-sm">
          {t.recalculate}
        </Link>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t.account}</h2>
        <button className="btn btn-ghost w-full" onClick={logout}>{t.logout}</button>
      </section>

      <section className="card p-4 space-y-3 border-danger/40">
        <h2 className="font-semibold text-danger">{t.danger_zone}</h2>
        <p className="text-xs text-muted">{t.delete_account_confirm}</p>
        <input className="input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} />
        <button className="btn btn-danger w-full" onClick={deleteAccount} disabled={busy}>
          {t.delete_account}
        </button>
      </section>

      {msg && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none">
          <span className="bg-accent text-[#06241a] rounded-full px-4 py-2 text-sm font-medium">{msg}</span>
        </div>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-2 rounded-xl p-2">
      <p className="font-medium">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
