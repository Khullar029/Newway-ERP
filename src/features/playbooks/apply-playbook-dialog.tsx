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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlaybooks, useApplyPlaybook } from "./use-playbooks";

export function ApplyPlaybookDialog({
  open,
  onOpenChange,
  clientId,
  campaignId,
  defaultAnchorDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  campaignId: string;
  defaultAnchorDate?: string | null;
}) {
  const { data: playbooks } = usePlaybooks();
  const apply = useApplyPlaybook();
  const [playbookId, setPlaybookId] = useState("");
  const [anchorDate, setAnchorDate] = useState(defaultAnchorDate ?? "");

  const selected = playbooks?.find((p) => p.id === playbookId);

  async function handleApply() {
    if (!selected) return toast.error("Choose a playbook");
    if (!anchorDate) return toast.error("Set an anchor (go-live) date");
    try {
      const created = await apply.mutateAsync({ playbook: selected, clientId, campaignId, anchorDate });
      toast.success(`${created?.length ?? 0} tasks created from "${selected.name}"`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply a playbook</DialogTitle>
          <DialogDescription>Generates a full dated task set for this campaign, computed from the anchor date.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Playbook</Label>
            <Select value={playbookId} onValueChange={setPlaybookId}>
              <SelectTrigger><SelectValue placeholder="Select a playbook" /></SelectTrigger>
              <SelectContent>
                {(playbooks ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.playbook_steps.length} steps)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Anchor date (usually go-live)</Label>
            <Input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
          </div>
          {selected && (
            <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Preview</p>
              <ul className="flex flex-col gap-0.5">
                {[...selected.playbook_steps]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span>{s.title}</span>
                      <span>{s.offset_days >= 0 ? `+${s.offset_days}d` : `${s.offset_days}d`}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={apply.isPending}>Generate tasks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
