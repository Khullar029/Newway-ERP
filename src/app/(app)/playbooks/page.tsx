"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { usePlaybooks, useCreatePlaybook } from "@/features/playbooks/use-playbooks";
import { PlaybookEditor } from "@/features/playbooks/playbook-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PlaybooksPage() {
  const { data: playbooks, isLoading } = usePlaybooks();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Playbooks</h1>
          <p className="text-sm text-muted-foreground">Reusable templates that turn repeat work into one-click task generation.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus /> New playbook</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {(playbooks ?? []).map((p) => <PlaybookEditor key={p.id} playbook={p} />)}
          {(playbooks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No playbooks yet.</p>}
        </div>
      )}

      <NewPlaybookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function NewPlaybookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePlaybook();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    try {
      await create.mutateAsync({ name: name.trim(), description: description || null });
      toast.success("Playbook created");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New playbook</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
