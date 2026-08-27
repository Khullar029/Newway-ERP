"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTasks } from "@/features/tasks/use-tasks";
import { TaskTable } from "@/features/tasks/task-table";
import { TaskKanban } from "@/features/tasks/task-kanban";
import { TaskFormDialog } from "@/features/tasks/task-form-dialog";
import { useClients } from "@/features/clients/use-clients";
import { useLanes } from "@/features/lanes/use-lanes";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskRow } from "@/features/tasks/use-tasks";

export default function TasksPage() {
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const [tab, setTab] = useState("table");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [laneId, setLaneId] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);

  const { data: clients } = useClients();
  const { data: lanes } = useLanes();

  const { data: tasks, isLoading } = useTasks({
    clientId: clientId || undefined,
    laneId: laneId || undefined,
    assigneeId: mineOnly ? profile?.id : undefined,
  });

  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (!search) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, search]);

  function openEdit(task: TaskRow) {
    setEditingTask(task);
    setDialogOpen(true);
  }
  function openCreate() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tasks</p>
        </div>
        {!readOnly && (
          <Button onClick={openCreate}><Plus /> New task</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full max-w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {!readOnly && (
              <Select value={clientId || "__all"} onValueChange={(v) => setClientId(v === "__all" ? "" : v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All clients</SelectItem>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={laneId || "__all"} onValueChange={(v) => setLaneId(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Lane" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All lanes</SelectItem>
                {(lanes ?? []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={mineOnly ? "default" : "outline"} onClick={() => setMineOnly((v) => !v)}>
              My tasks
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <>
            <TabsContent value="table">
              <TaskTable tasks={filtered} onEdit={openEdit} readOnly={readOnly} />
            </TabsContent>
            <TabsContent value="kanban">
              <TaskKanban tasks={filtered} onEdit={openEdit} readOnly={readOnly} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {!readOnly && <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} />}
    </div>
  );
}
