"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClient, useUpdateClient } from "./use-clients";
import type { ClientStatus, ClientType, PriorityLevel, Tables } from "@/types/database";

const CLIENT_TYPES: ClientType[] = ["Seeds", "Ag-Inputs/Bio", "Distribution", "Supplier", "Other"];
const CLIENT_STATUSES: ClientStatus[] = ["Active", "Prospect", "Dormant"];
const PRIORITIES: PriorityLevel[] = ["High", "Medium", "Low"];

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Tables<"clients"> | null;
}) {
  const isEdit = !!client;
  const create = useCreateClient();
  const update = useUpdateClient();

  const [form, setForm] = useState(() => initialForm(client));

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      region: form.region || null,
      status: form.status,
      priority: form.priority,
      products_focus: form.products_focus || null,
      credit_limit: Number(form.credit_limit) || 0,
      notes: form.notes || null,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: client.id, ...payload });
        toast.success("Client updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Client created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? client?.id ?? "new" : "closed"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>Client organisations you run campaigns and content for.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as ClientType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ClientStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as PriorityLevel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Products focus</Label>
            <Input value={form.products_focus} onChange={(e) => setForm((f) => ({ ...f, products_focus: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Credit limit (INR)</Label>
            <Input type="number" min="0" value={form.credit_limit} onChange={(e) => setForm((f) => ({ ...f, credit_limit: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? "Save changes" : "Create client"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialForm(client?: Tables<"clients"> | null) {
  if (!client) {
    return { name: "", type: "Seeds" as ClientType, region: "", status: "Active" as ClientStatus, priority: "Medium" as PriorityLevel, products_focus: "", credit_limit: "0", notes: "" };
  }
  return {
    name: client.name,
    type: client.type,
    region: client.region ?? "",
    status: client.status,
    priority: client.priority,
    products_focus: client.products_focus ?? "",
    credit_limit: String(client.credit_limit ?? 0),
    notes: client.notes ?? "",
  };
}
