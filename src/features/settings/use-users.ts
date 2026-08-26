"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/database";

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

export interface ProfileRow extends Tables<"profiles"> {
  clients: { name: string } | null;
}

// Admin-only: every profile in the workspace, for the user management screen.
export function useAllProfiles() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, clients(name)").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });
}

export function useUpdateProfile() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"profiles"> & { id: string }) => {
      const { error } = await supabase.from("profiles").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["assignable-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
