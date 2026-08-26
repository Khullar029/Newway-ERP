"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// Assignable internal users (Admin/Team). Client-role profiles are excluded
// since clients never own or get assigned internal work.
export function useAssignableUsers() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("role", ["Admin", "Team"]).eq("active", true).order("full_name");
      if (error) throw error;
      return data as Tables<"profiles">[];
    },
    staleTime: 5 * 60_000,
  });
}
