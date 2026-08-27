"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEventType, TablesInsert } from "@/types/database";

export interface EventRow {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  title: string;
  type: CalendarEventType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  clients: { name: string } | null;
}

export function useCalendarEvents(rangeStart: string, rangeEnd: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["calendar-events", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, client_id, campaign_id, title, type, starts_at, ends_at, location, clients(name)")
        .gte("starts_at", rangeStart)
        .lte("starts_at", rangeEnd)
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });
}

export function useCreateEvent() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"calendar_events">) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("calendar_events").insert({ ...input, created_by: userData.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

export function useDeleteEvent() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}
