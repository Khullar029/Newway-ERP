"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/utils";
import { useAddComment, useComments, type CommentEntityType } from "./use-comments";

export function CommentThread({ entityType, entityId }: { entityType: CommentEntityType; entityId: string }) {
  const { data: comments, isLoading } = useComments(entityType, entityId);
  const addComment = useAddComment(entityType, entityId);
  const [body, setBody] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await addComment.mutateAsync(body.trim());
      setBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading comments…</p>}
        {!isLoading && (comments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {(comments ?? []).map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback>{initials(c.profiles?.full_name)}</AvatarFallback></Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.profiles?.full_name ?? "Unknown"}</span>
                <span>{formatDate(c.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea rows={2} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={addComment.isPending || !body.trim()} className="self-end">Post</Button>
      </form>
    </div>
  );
}
