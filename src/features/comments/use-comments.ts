"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type CommentEntityType = "task" | "content_item" | "campaign";

export interface CommentRow {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; role: string } | null;
}

export function useComments(entityType: CommentEntityType, entityId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["comments", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, entity_type, entity_id, author_id, body, created_at, profiles(full_name, role)")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });
}

export function useAddComment(entityType: CommentEntityType, entityId: string | undefined) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId!,
        author_id: userData.user!.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] }),
  });
}
