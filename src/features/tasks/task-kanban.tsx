"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityBadge } from "@/components/badges";
import { formatDate } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { TaskRow } from "./use-tasks";
import { useUpdateTask } from "./use-tasks";
import type { TaskStatus } from "@/types/database";

const COLUMNS: TaskStatus[] = ["Not Started", "In Progress", "Blocked", "Done"];

export function TaskKanban({ tasks, onEdit, readOnly }: { tasks: TaskRow[]; onEdit: (t: TaskRow) => void; readOnly?: boolean }) {
  const update = useUpdateTask();
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const status = e.over?.id as TaskStatus | undefined;
    const taskId = e.active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (status && task && task.status !== status) {
      update.mutate({ id: taskId, status });
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            onEdit={onEdit}
            readOnly={readOnly}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} onEdit={() => {}} dragging />}</DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  readOnly,
}: {
  status: TaskStatus;
  tasks: TaskRow[];
  onEdit: (t: TaskRow) => void;
  readOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: readOnly });
  return (
    <div ref={setNodeRef} className={`flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2 transition-colors ${isOver ? "bg-accent/60" : ""}`}>
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-sm font-semibold">{status}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-16">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} draggable={!readOnly} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, draggable = true, dragging }: { task: TaskRow; onEdit: (t: TaskRow) => void; draggable?: boolean; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id, disabled: !draggable });
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date && task.due_date < today && task.status !== "Done";

  return (
    <Card
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => !dragging && onEdit(task)}
      className={`cursor-pointer touch-none ${dragging ? "shadow-lg" : ""}`}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    >
      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-snug">{task.title}</span>
          {task.is_critical_path && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
        </div>
        <p className="text-xs text-muted-foreground">{task.clients?.name}</p>
        <div className="flex items-center justify-between">
          <PriorityBadge priority={task.priority} />
          {task.due_date && <span className={`text-xs ${overdue ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{formatDate(task.due_date)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
