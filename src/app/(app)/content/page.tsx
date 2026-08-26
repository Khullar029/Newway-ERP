"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useContentItems } from "@/features/content/use-content";
import { ContentKanban } from "@/features/content/content-kanban";
import { ContentFormDialog } from "@/features/content/content-form-dialog";
import { ContentDetailDialog } from "@/features/content/content-detail-dialog";
import { useClients } from "@/features/clients/use-clients";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentRow } from "@/features/content/use-content";

export default function ContentPage() {
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const [clientId, setClientId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ContentRow | null>(null);
  const [editingItem, setEditingItem] = useState<ContentRow | null>(null);

  const { data: clients } = useClients();
  const { data: items, isLoading } = useContentItems({ clientId: clientId || undefined });

  function openNew() {
    setEditingItem(null);
    setDialogOpen(true);
  }
  function openEditFromDetail(item: ContentRow) {
    setDetailItem(null);
    setEditingItem(item);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Content</h1>
          <p className="text-sm text-muted-foreground">{items?.length ?? 0} items in the pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Select value={clientId || "__all"} onValueChange={(v) => setClientId(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All clients</SelectItem>
                {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {!readOnly && <Button onClick={openNew}><Plus /> New content</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-64" />)}</div>
      ) : (
        <ContentKanban items={items ?? []} onOpen={setDetailItem} readOnly={readOnly} />
      )}

      {!readOnly && <ContentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editingItem} />}
      <ContentDetailDialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)} item={detailItem} onEdit={openEditFromDetail} />
    </div>
  );
}
