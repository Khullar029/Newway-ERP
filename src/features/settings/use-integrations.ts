"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { IntegrationProvider, Tables } from "@/types/database";

export function useIntegrations() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_connections").select("*");
      if (error) throw error;
      return data as Tables<"integration_connections">[];
    },
  });
}

// Connecting a real provider means an OAuth round-trip (Google) or a token
// paste (Meta/WhatsApp/Voice AI) handled by an Edge Function — see
// supabase/functions/integrations-connect/index.ts. This just flips the
// stored status so the Settings UI and downstream Edge Functions have
// something to check; wire the real handshake in when you're ready.
export function useToggleIntegration() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, connect }: { provider: IntegrationProvider; connect: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("integration_connections").upsert(
        {
          provider,
          status: connect ? "connected" : "disconnected",
          created_by: userData.user?.id,
        },
        { onConflict: "provider" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}
