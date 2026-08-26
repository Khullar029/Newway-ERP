"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PriorityLevel, TablesInsert, TablesUpdate, TaskStatus } from "@/types/database";

export interface TaskRow {
  id: string;
  client_id: string;
  campaign_id: string | null;
  lane_id: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  assignee_id: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  due_date: string | null;
  created_date: string;
  completed_at: string | null;
  sort_order: number;
  parent_task_id: string | null;
  depends_on: string[];
  is_critical_path: boolean;
  created_at: string;
  updated_at: string;
  clients: { name: string } | null;
  campaigns: { name: string } | null;
  lanes: { name: string; color: string } | null;
  assignee: { full_name: string | null } | null;
}

export interface TaskFilters {
  clientId?: string;
  campaignId?: string;
  laneId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  search?: string;
}

const TASK_SELECT =
  "id, client_id, campaign_id, lane_id, title, description, owner_id, assignee_id, priority, status, due_date, created_date, completed_at, sort_order, parent_task_id, depends_on, is_critical_path, created_at, updated_at, clients(name), campaigns(name), lanes(name, color), assignee:profiles!tasks_assignee_id_fkey(full_name)";

export function useTasks(filters: TaskFilters = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let q = supabase.from("tasks").select(TASK_SELECT).order("sort_order").order("due_date", { nullsFirst: false });
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.campaignId) q = q.eq("campaign_id", filters.campaignId);
      if (filters.laneId) q = q.eq("lane_id", filters.laneId);
      if (filters.assigneeId) q = q.eq("assignee_id", filters.assigneeId);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.search) q = q.ilike("title", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TaskRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}

export function useCreateTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"tasks">) => {
      const { data, error } = await supabase.from("tasks").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"tasks"> & { id: string }) => {
      const patch = { ...input } as TablesUpdate<"tasks">;
      if (patch.status === "Done" && !patch.completed_at) patch.completed_at = new Date().toISOString();
      if (patch.status && patch.status !== "Done") patch.completed_at = null;
      const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueriesData<TaskRow[]>({ queryKey: ["tasks"] });
      qc.setQueriesData<TaskRow[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useBulkUpdateTasks() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: TablesUpdate<"tasks"> }) => {
      const { error } = await supabase.from("tasks").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
