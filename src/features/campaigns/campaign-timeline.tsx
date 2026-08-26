"use client";

import { formatDate } from "@/lib/utils";
import { AlertCircle, Ban } from "lucide-react";
import type { TaskRow } from "@/features/tasks/use-tasks";

const DAY_MS = 86400000;
const DAY_WIDTH = 34;

function toDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return d;
}
function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function CampaignTimeline({ tasks, goLiveDate }: { tasks: TaskRow[]; goLiveDate: string | null }) {
  const dated = tasks.filter((t) => t.due_date);
  if (dated.length === 0) {
    return <p className="text-sm text-muted-foreground">No dated tasks yet — apply a playbook or set due dates to see the sprint timeline.</p>;
  }

  const allDates = dated.flatMap((t) => [toDate(t.created_date), toDate(t.due_date!)]);
  if (goLiveDate) allDates.push(toDate(goLiveDate));
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.max(1, dayDiff(minDate, maxDate) + 1);

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const sorted = [...dated].sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  const days = Array.from({ length: totalDays }, (_, i) => new Date(minDate.getTime() + i * DAY_MS));
  const goLiveOffset = goLiveDate ? dayDiff(minDate, toDate(goLiveDate)) : null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div style={{ width: 220 + totalDays * DAY_WIDTH }}>
        {/* Header row: dates */}
        <div className="flex border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
          <div className="w-56 shrink-0 border-r border-border px-2 py-1.5 font-medium">Task</div>
          <div className="relative flex">
            {days.map((d, i) => (
              <div key={i} style={{ width: DAY_WIDTH }} className="shrink-0 border-r border-border/50 py-1.5 text-center">
                {d.getDate()}
                <div className="text-[9px]">{d.toLocaleDateString("en-IN", { month: "short" })}</div>
              </div>
            ))}
            {goLiveOffset != null && goLiveOffset >= 0 && goLiveOffset < totalDays && (
              <div
                className="pointer-events-none absolute top-0 h-full border-l-2 border-dashed border-destructive"
                style={{ left: goLiveOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                title="Go live"
              />
            )}
          </div>
        </div>

        {/* Rows */}
        {sorted.map((t) => {
          const start = dayDiff(minDate, toDate(t.created_date));
          const end = dayDiff(minDate, toDate(t.due_date!));
          const span = Math.max(1, end - start + 1);
          const blockers = (t.depends_on ?? []).map((id) => byId.get(id)).filter(Boolean) as TaskRow[];
          const isBlocked = blockers.some((b) => b.status !== "Done");
          const color = t.lanes?.color ?? "#2E5496";
          return (
            <div key={t.id} className="flex border-b border-border last:border-0">
              <div className="flex w-56 shrink-0 items-center gap-1.5 truncate border-r border-border px-2 py-1.5 text-xs">
                {t.is_critical_path && <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />}
                {isBlocked && <Ban className="h-3 w-3 shrink-0 text-warning" />}
                <span className="truncate">{t.title}</span>
              </div>
              <div className="relative flex-1" style={{ height: 30 }}>
                <div
                  className={`absolute top-1 h-5 rounded-sm ${t.status === "Done" ? "opacity-50" : ""} ${t.is_critical_path ? "ring-2 ring-destructive" : ""}`}
                  style={{ left: start * DAY_WIDTH, width: span * DAY_WIDTH - 2, background: color }}
                  title={`${t.title}\n${formatDate(t.created_date)} → ${formatDate(t.due_date)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
