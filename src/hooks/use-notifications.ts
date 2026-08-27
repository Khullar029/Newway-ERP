"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import { useProfile } from "./use-profile";

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const query = useQuery({
    queryKey: ["notifications", profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<Tables<"notifications">[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", profile.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, supabase, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = (query.data ?? []).filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.read_at).length;

  return { ...query, unreadCount, markRead, markAllRead };
}
