"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles"> & { email: string | null };

export function useProfile() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return useQuery({
    queryKey: ["profile", userId],
    enabled: userId !== undefined,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const [{ data: profile, error }, { data: userData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      return { ...profile, email: userData.user?.email ?? null };
    },
    staleTime: 60_000,
  });
}
