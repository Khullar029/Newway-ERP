"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/features/clients/use-clients";
import { useAssignableUsers } from "@/features/settings/use-users";
import {
  useCreateContentItem,
  useUpdateContentItem,
  useUploadContentFile,
  type ContentRow,
} from "./use-content";
import type { ContentStage, ContentType } from "@/types/database";

const TYPES: ContentType[] = ["Micro-drama", "Reel", "Video", "Post", "Ad-creative", "Script"];
const STAGES: ContentStage[] = ["Idea", "Scripting", "Shooting", "Editing", "Review", "Approved", "Published"];

export function ContentFormDialog({
  open,
  onOpenChange,
  item,
  defaultClientId,
  defaultCampaignId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ContentRow | null;
  defaultClientId?: string;
  defaultCampaignId?: string;
}) {
  const isEdit = !!item;
  const { data: clients } = useClients();
  const { data: users } = useAssignableUsers();
  const create = useCreateContentItem();
  const update = useUpdateContentItem();
  const upload = useUploadContentFile();
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState(() => ({
    title: item?.title ?? "",
    type: (item?.type ?? "Reel") as ContentType,
    stage: (item?.stage ?? "Idea") as ContentStage,
    client_id: item?.client_id ?? defaultClientId ?? "",
    assignee_id: item?.assignee_id ?? "",
    due_date: item?.due_date ?? "",
    notes: item?.notes ?? "",
  }));

  const pending = create.isPending || update.isPending || upload.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.client_id) return toast.error("Client is required");

    try {
      let file_url = item?.file_url ?? null;
      if (file) {
        file_url = await upload.mutateAsync({ clientId: form.client_id, file });
      }
      const payload = {
        title: form.title.trim(),
        type: form.type,
        stage: form.stage,
        client_id: form.client_id,
        campaign_id: item?.campaign_id ?? defaultCampaignId ?? null,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        file_url,
      };
      if (isEdit) {
        await update.mutateAsync({ id: item.id, ...payload });
        toast.success("Content item updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Content item created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? item?.id ?? "new" : "closed"}>
        <DialogHeader><DialogTitle>{isEdit ? "Edit content item" : "New content item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))} disabled={!!defaultClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as ContentStage }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Select value={form.assignee_id || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, assignee_id: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || "—"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Due date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>File {item?.file_url && <span className="text-xs text-muted-foreground">(replaces existing)</span>}</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? "Save changes" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
