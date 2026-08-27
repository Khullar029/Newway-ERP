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
import { useLanes } from "@/features/lanes/use-lanes";
import { useAssignableUsers } from "@/features/settings/use-users";
import { useCreateTask, useUpdateTask, type TaskRow } from "./use-tasks";
import type { PriorityLevel, TaskStatus } from "@/types/database";

const PRIORITIES: PriorityLevel[] = ["High", "Medium", "Low"];
const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Blocked", "Done"];

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultClientId,
  defaultCampaignId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  defaultClientId?: string;
  defaultCampaignId?: string;
}) {
  const isEdit = !!task;
  const { data: clients } = useClients();
  const { data: lanes } = useLanes();
  const { data: users } = useAssignableUsers();
  const create = useCreateTask();
  const update = useUpdateTask();

  const [form, setForm] = useState(() => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    client_id: task?.client_id ?? defaultClientId ?? "",
    lane_id: task?.lane_id ?? "",
    assignee_id: task?.assignee_id ?? "",
    priority: (task?.priority ?? "Medium") as PriorityLevel,
    status: (task?.status ?? "Not Started") as TaskStatus,
    due_date: task?.due_date ?? "",
  }));

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.client_id) return toast.error("Client is required");

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      client_id: form.client_id,
      campaign_id: task?.campaign_id ?? defaultCampaignId ?? null,
      lane_id: form.lane_id || null,
      assignee_id: form.assignee_id || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: task.id, ...payload });
        toast.success("Task updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? task?.id ?? "new" : "closed"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))} disabled={!!defaultClientId || !!task}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Lane</Label>
              <Select value={form.lane_id} onValueChange={(v) => setForm((f) => ({ ...f, lane_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select lane" /></SelectTrigger>
                <SelectContent>
                  {(lanes ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as PriorityLevel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex flex-col gap-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
