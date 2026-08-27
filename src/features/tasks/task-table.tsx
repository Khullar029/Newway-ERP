"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Ban, Pencil, Trash2 } from "lucide-react";
import type { TaskRow } from "./use-tasks";
import { useBulkUpdateTasks, useDeleteTask, useUpdateTask } from "./use-tasks";
import type { TaskStatus } from "@/types/database";
import { toast } from "sonner";

const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Blocked", "Done"];

export function TaskTable({ tasks, onEdit, readOnly }: { tasks: TaskRow[]; onEdit: (t: TaskRow) => void; readOnly?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const update = useUpdateTask();
  const del = useDeleteTask();
  const bulk = useBulkUpdateTasks();

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const today = new Date().toISOString().slice(0, 10);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkStatus(status: TaskStatus) {
    try {
      await bulk.mutateAsync({ ids: Array.from(selected), patch: { status } });
      setSelected(new Set());
      toast.success("Tasks updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {selected.size > 0 && !readOnly && (
        <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => bulkStatus(s)}>{s}</Button>
            ))}
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly && <TableHead className="w-8"></TableHead>}
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Lane</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Assignee</TableHead>
            {!readOnly && <TableHead className="w-16"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => {
            const blockers = (t.depends_on ?? []).map((id) => byId.get(id)).filter(Boolean) as TaskRow[];
            const isBlocked = blockers.some((b) => b.status !== "Done");
            const overdue = t.due_date && t.due_date < today && t.status !== "Done";
            return (
              <TableRow key={t.id}>
                {!readOnly && (
                  <TableCell>
                    <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                  </TableCell>
                )}
                <TableCell className="max-w-72">
                  <div className="flex items-center gap-1.5">
                    {t.is_critical_path && <span title="Critical path"><AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" /></span>}
                    {isBlocked && <span title="Blocked by dependency"><Ban className="h-3.5 w-3.5 shrink-0 text-warning" /></span>}
                    <span className="truncate">{t.title}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-32 truncate">{t.clients?.name ?? "—"}</TableCell>
                <TableCell>
                  {t.lanes && (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: t.lanes.color }} />
                      {t.lanes.name}
                    </span>
                  )}
                </TableCell>
                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                <TableCell>
                  {readOnly ? (
                    <StatusBadge status={t.status} />
                  ) : (
                    <Select value={t.status} onValueChange={(v) => update.mutate({ id: t.id, status: v as TaskStatus })}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className={overdue ? "font-medium text-destructive" : ""}>{formatDate(t.due_date)}</TableCell>
                <TableCell className="max-w-28 truncate">{t.assignee?.full_name ?? "—"}</TableCell>
                {!readOnly && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No tasks match these filters.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
