"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import type { Profile } from "@/lib/types";

interface ProfileValue {
  profile: Profile;
  refresh: () => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({
  initial,
  children,
}: {
  initial: Profile;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile>(initial);
  const { setLang } = useT();

  // Profile language wins over the local fallback.
  useEffect(() => {
    setLang(profile.language);
  }, [profile.language, setLang]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .single();
    if (data) setProfile(data as Profile);
  }, [profile.id]);

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", profile.id)
        .select()
        .single();
      if (error) throw error;
      if (data) setProfile(data as Profile);
    },
    [profile.id]
  );

  return (
    <ProfileContext.Provider value={{ profile, refresh, update }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const v = useContext(ProfileContext);
  if (!v) throw new Error("useProfile must be used inside ProfileProvider");
  return v;
}
