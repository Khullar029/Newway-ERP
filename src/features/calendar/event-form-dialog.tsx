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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/features/clients/use-clients";
import { useCreateEvent } from "./use-calendar";
import type { CalendarEventType } from "@/types/database";

const TYPES: CalendarEventType[] = ["Meeting", "Go-Live", "Follow-up", "Deadline", "Reminder"];

export function EventFormDialog({ open, onOpenChange, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; defaultDate?: string }) {
  const { data: clients } = useClients();
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CalendarEventType>("Meeting");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(() => defaultDate ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    try {
      await create.mutateAsync({
        title: title.trim(),
        type,
        client_id: clientId || null,
        starts_at: new Date(`${date}T${time}:00`).toISOString(),
        location: location || null,
      });
      toast.success("Event created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? "open" : "closed"}>
        <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Client (optional)</Label>
              <Select value={clientId || "__none"} onValueChange={(v) => setClientId(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Internal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Internal</SelectItem>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
