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
import { useCreateCampaign, useUpdateCampaign, type CampaignRow } from "./use-campaigns";
import type { CampaignStatus, ChannelType } from "@/types/database";

const STATUSES: CampaignStatus[] = ["Planning", "Building", "Live", "Paused", "Done"];
const CHANNELS: ChannelType[] = ["Meta", "Truecaller", "WhatsApp", "Voice", "YouTube", "SEO", "Google Ads", "GMB"];

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: CampaignRow | null;
  defaultClientId?: string;
}) {
  const isEdit = !!campaign;
  const { data: clients } = useClients();
  const { data: lanes } = useLanes();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();

  const [form, setForm] = useState(() => ({
    name: campaign?.name ?? "",
    client_id: campaign?.client_id ?? defaultClientId ?? "",
    crop: campaign?.crop ?? "",
    region: campaign?.region ?? "",
    channels: campaign?.channels ?? ([] as ChannelType[]),
    status: (campaign?.status ?? "Planning") as CampaignStatus,
    go_live_date: campaign?.go_live_date ?? "",
    budget: campaign?.budget != null ? String(campaign.budget) : "",
    lane_id: campaign?.lane_id ?? "",
    description: campaign?.description ?? "",
  }));

  const pending = create.isPending || update.isPending;

  function toggleChannel(c: ChannelType) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.client_id) return toast.error("Client is required");

    const payload = {
      name: form.name.trim(),
      client_id: form.client_id,
      crop: form.crop || null,
      region: form.region || null,
      channels: form.channels,
      status: form.status,
      go_live_date: form.go_live_date || null,
      budget: form.budget ? Number(form.budget) : null,
      lane_id: form.lane_id || null,
      description: form.description || null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: campaign.id, ...payload });
        toast.success("Campaign updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Campaign created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? campaign?.id ?? "new" : "closed"} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit campaign" : "New campaign"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))} disabled={!!defaultClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Crop</Label>
              <Input value={form.crop} onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Channels</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleChannel(c)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${form.channels.includes(c) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Go-live date</Label>
              <Input type="date" value={form.go_live_date} onChange={(e) => setForm((f) => ({ ...f, go_live_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Budget (INR)</Label>
              <Input type="number" min="0" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
            </div>
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
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{isEdit ? "Save changes" : "Create campaign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
