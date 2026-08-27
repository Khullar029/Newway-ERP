"use client";

import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanes } from "@/features/lanes/use-lanes";
import {
  useCreateStep,
  useDeleteStep,
  useUpdatePlaybook,
  useUpdateStep,
  type PlaybookWithSteps,
} from "./use-playbooks";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["Admin", "Team"];

export function PlaybookEditor({ playbook }: { playbook: PlaybookWithSteps }) {
  const { data: lanes } = useLanes();
  const updatePlaybook = useUpdatePlaybook();
  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

  const steps = [...playbook.playbook_steps].sort((a, b) => a.sort_order - b.sort_order);

  async function addStep() {
    try {
      await createStep.mutateAsync({
        playbook_id: playbook.id,
        title: "New step",
        offset_days: 0,
        default_owner_role: "Team",
        sort_order: steps.length,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function move(stepId: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === stepId);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= steps.length) return;
    await Promise.all([
      updateStep.mutateAsync({ id: steps[idx].id, sort_order: swapIdx }),
      updateStep.mutateAsync({ id: steps[swapIdx].id, sort_order: idx }),
    ]);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{playbook.name}</CardTitle>
          <Select value={playbook.lane_id ?? ""} onValueChange={(v) => updatePlaybook.mutate({ id: playbook.id, lane_id: v })}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Lane" /></SelectTrigger>
            <SelectContent>
              {(lanes ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{playbook.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <div className="flex flex-col">
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(step.id, -1)} disabled={i === 0}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(step.id, 1)} disabled={i === steps.length - 1}>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <Input
              className="min-w-48 flex-1"
              defaultValue={step.title}
              onBlur={(e) => e.target.value !== step.title && updateStep.mutate({ id: step.id, title: e.target.value })}
            />
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">Offset</Label>
              <Input
                type="number"
                className="w-20"
                defaultValue={step.offset_days}
                onBlur={(e) => Number(e.target.value) !== step.offset_days && updateStep.mutate({ id: step.id, offset_days: Number(e.target.value) })}
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            <Select value={step.default_owner_role} onValueChange={(v) => updateStep.mutate({ id: step.id, default_owner_role: v as UserRole })}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteStep.mutate(step.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={addStep}>
          <Plus className="h-3.5 w-3.5" /> Add step
        </Button>
      </CardContent>
    </Card>
  );
}
