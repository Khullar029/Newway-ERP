"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ContentStage, ContentType, TablesInsert, TablesUpdate } from "@/types/database";

export interface ContentRow {
  id: string;
  client_id: string;
  campaign_id: string | null;
  type: ContentType;
  title: string;
  stage: ContentStage;
  assignee_id: string | null;
  due_date: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients: { name: string } | null;
  campaigns: { name: string } | null;
  assignee: { full_name: string | null } | null;
}

export interface ContentFilters {
  clientId?: string;
  campaignId?: string;
  stage?: ContentStage;
  type?: ContentType;
}

const CONTENT_SELECT =
  "id, client_id, campaign_id, type, title, stage, assignee_id, due_date, file_url, notes, created_at, updated_at, clients(name), campaigns(name), assignee:profiles!content_items_assignee_id_fkey(full_name)";

export function useContentItems(filters: ContentFilters = {}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["content-items", filters],
    queryFn: async () => {
      let q = supabase.from("content_items").select(CONTENT_SELECT).order("due_date", { nullsFirst: false });
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.campaignId) q = q.eq("campaign_id", filters.campaignId);
      if (filters.stage) q = q.eq("stage", filters.stage);
      if (filters.type) q = q.eq("type", filters.type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ContentRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("content-items-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_items" }, () => {
        qc.invalidateQueries({ queryKey: ["content-items"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}

export function useCreateContentItem() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"content_items">) => {
      const { data, error } = await supabase.from("content_items").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-items"] }),
  });
}

export function useUpdateContentItem() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TablesUpdate<"content_items"> & { id: string }) => {
      const { data, error } = await supabase.from("content_items").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-items"] }),
  });
}

export function useDeleteContentItem() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-items"] }),
  });
}

// Uploads to the private `attachments` bucket under <client_id>/content/<file>,
// matching the storage RLS policy (see supabase/migrations/0004_storage.sql).
export function useUploadContentFile() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ clientId, file }: { clientId: string; file: File }) => {
      const path = `${clientId}/content/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
      if (error) throw error;
      return path;
    },
  });
}

export function useSignedFileUrl(path: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 55 * 60_000,
  });
}
