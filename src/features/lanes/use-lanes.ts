"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export function useLanes() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["lanes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lanes").select("*").order("sort_order");
      if (error) throw error;
      return data as Tables<"lanes">[];
    },
    staleTime: 5 * 60_000,
  });
}
