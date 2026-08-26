"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export interface PlaybookWithSteps extends Tables<"playbooks"> {
  playbook_steps: Tables<"playbook_steps">[];
  lanes: { name: string; color: string } | null;
}

export function usePlaybooks() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["playbooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playbooks")
        .select("*, lanes(name, color), playbook_steps(*)")
        .is("archived_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PlaybookWithSteps[];
    },
  });
}

export function useCreatePlaybook() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"playbooks">) => {
      const { data, error } = await supabase.from("playbooks").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useUpdatePlaybook() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"playbooks"> & { id: string }) => {
      const { error } = await supabase.from("playbooks").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useCreateStep() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"playbook_steps">) => {
      const { data, error } = await supabase.from("playbook_steps").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useUpdateStep() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"playbook_steps"> & { id: string }) => {
      const { error } = await supabase.from("playbook_steps").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useDeleteStep() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playbook_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

// Apply a playbook to a campaign: generate `tasks` from `playbook_steps`,
// computing due_date = anchorDate + offset_days, preserving order and
// assigning based on default_owner_role (left unassigned; a human picks who).
export function useApplyPlaybook() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playbook,
      clientId,
      campaignId,
      anchorDate,
    }: {
      playbook: PlaybookWithSteps;
      clientId: string;
      campaignId: string;
      anchorDate: string;
    }) => {
      const anchor = new Date(anchorDate + "T00:00:00");
      const steps = [...playbook.playbook_steps].sort((a, b) => a.sort_order - b.sort_order);
      const rows: TablesInsert<"tasks">[] = steps.map((step) => {
        const due = new Date(anchor);
        due.setDate(due.getDate() + step.offset_days);
        return {
          client_id: clientId,
          campaign_id: campaignId,
          lane_id: playbook.lane_id,
          title: step.title,
          description: step.description,
          priority: "Medium",
          status: "Not Started",
          due_date: due.toISOString().slice(0, 10),
          sort_order: step.sort_order,
        };
      });
      const { data, error } = await supabase.from("tasks").insert(rows).select();
      if (error) throw error;
      await supabase.from("campaigns").update({ playbook_id: playbook.id }).eq("id", campaignId);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["campaign", vars.campaignId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
