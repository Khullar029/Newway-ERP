"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/badges";
import { CommentThread } from "@/features/comments/comment-thread";
import { formatDate } from "@/lib/utils";
import { FileText, Pencil } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useSignedFileUrl, useUpdateContentItem, type ContentRow } from "./use-content";

export function ContentDetailDialog({
  open,
  onOpenChange,
  item,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContentRow | null;
  onEdit: (item: ContentRow) => void;
}) {
  const { data: profile } = useProfile();
  const { data: signedUrl } = useSignedFileUrl(item?.file_url);
  const update = useUpdateContentItem();
  const isClient = profile?.role === "Client";

  if (!item) return null;

  async function approve() {
    try {
      await update.mutateAsync({ id: item!.id, stage: "Approved" });
      toast.success("Deliverable approved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{item.title}</DialogTitle>
            <StatusBadge status={item.stage} />
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">{item.type} · {item.clients?.name}{item.campaigns?.name ? ` · ${item.campaigns.name}` : ""}</p>
          <p className="text-xs text-muted-foreground">Due {formatDate(item.due_date)} · Assignee: {item.assignee?.full_name ?? "Unassigned"}</p>
          {item.notes && <p>{item.notes}</p>}
          {signedUrl && (
            <a href={signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
              <FileText className="h-4 w-4" /> View file
            </a>
          )}
        </div>
        <Separator />
        <CommentThread entityType="content_item" entityId={item.id} />
        <DialogFooter>
          {isClient ? (
            item.stage === "Review" && (
              <Button onClick={approve} disabled={update.isPending}>Approve deliverable</Button>
            )
          ) : (
            <Button variant="outline" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
