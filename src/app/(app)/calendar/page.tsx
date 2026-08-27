"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCalendarEvents } from "@/features/calendar/use-calendar";
import { EventFormDialog } from "@/features/calendar/event-form-dialog";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { EventRow } from "@/features/calendar/use-calendar";

const EVENT_COLOR: Record<string, string> = {
  Meeting: "bg-secondary text-secondary-foreground",
  "Go-Live": "bg-success text-success-foreground",
  "Follow-up": "bg-accent text-accent-foreground",
  Deadline: "bg-destructive/80 text-destructive-foreground",
  Reminder: "bg-warning/80 text-warning-foreground",
};

export default function CalendarPage() {
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const [monthOffset, setMonthOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { firstDay, daysInMonth, monthLabel, rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      firstDay: first,
      daysInMonth: last.getDate(),
      monthLabel: base.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      rangeStart: first.toISOString(),
      rangeEnd: new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }, [monthOffset]);

  const { data: events } = useCalendarEvents(rangeStart, rangeEnd);

  const eventsByDay = useMemo(() => {
    const map: Record<number, EventRow[]> = {};
    for (const e of events ?? []) {
      const day = new Date(e.starts_at).getDate();
      (map[day] ??= []).push(e);
    }
    return map;
  }, [events]);

  const leadingBlanks = firstDay.getDay();
  const cells = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setMonthOffset((m) => m - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="w-44 text-center text-lg font-semibold">{monthLabel}</h1>
          <Button size="icon" variant="outline" onClick={() => setMonthOffset((m) => m + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {!readOnly && <Button onClick={() => setDialogOpen(true)}><Plus /> New event</Button>}
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-card p-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-1 py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-24 rounded-md border border-border/60 p-1 ${day === null ? "bg-muted/20" : ""}`}>
            {day !== null && (
              <>
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {(eventsByDay[day] ?? []).slice(0, 3).map((e) => (
                    <span key={e.id} className={`truncate rounded px-1 py-0.5 text-[10px] ${EVENT_COLOR[e.type] ?? "bg-accent"}`} title={e.title}>
                      {e.title}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Agenda</h2>
        {(events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No events this month.</p>}
        {(events ?? []).map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-sm">
            <div>
              <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${EVENT_COLOR[e.type] ?? "bg-accent"}`}>{e.type}</span>
              {e.title} {e.clients?.name && <span className="text-muted-foreground">— {e.clients.name}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(e.starts_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>

      {!readOnly && <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
