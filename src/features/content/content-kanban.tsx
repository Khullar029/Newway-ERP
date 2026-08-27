"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Clapperboard } from "lucide-react";
import type { ContentRow } from "./use-content";
import { useUpdateContentItem } from "./use-content";
import type { ContentStage } from "@/types/database";

const STAGES: ContentStage[] = ["Idea", "Scripting", "Shooting", "Editing", "Review", "Approved", "Published"];

export function ContentKanban({ items, onOpen, readOnly }: { items: ContentRow[]; onOpen: (item: ContentRow) => void; readOnly?: boolean }) {
  const update = useUpdateContentItem();
  const [active, setActive] = useState<ContentRow | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActive(items.find((i) => i.id === e.active.id) ?? null);
  }
  function handleDragEnd(e: DragEndEvent) {
    setActive(null);
    const stage = e.over?.id as ContentStage | undefined;
    const id = e.active.id as string;
    const item = items.find((i) => i.id === id);
    if (stage && item && item.stage !== stage) update.mutate({ id, stage });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} items={items.filter((i) => i.stage === stage)} onOpen={onOpen} readOnly={readOnly} />
        ))}
      </div>
      <DragOverlay>{active && <ItemCard item={active} onOpen={() => {}} dragging />}</DragOverlay>
    </DndContext>
  );
}

function Column({ stage, items, onOpen, readOnly }: { stage: ContentStage; items: ContentRow[]; onOpen: (i: ContentRow) => void; readOnly?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: readOnly });
  return (
    <div ref={setNodeRef} className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2 ${isOver ? "bg-accent/60" : ""}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{stage}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onOpen={onOpen} draggable={!readOnly} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, onOpen, draggable = true, dragging }: { item: ContentRow; onOpen: (i: ContentRow) => void; draggable?: boolean; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, disabled: !draggable });
  return (
    <Card
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => !dragging && onOpen(item)}
      className={`cursor-pointer touch-none ${dragging ? "shadow-lg" : ""}`}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    >
      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clapperboard className="h-3 w-3" /> {item.type}
        </div>
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.clients?.name}</p>
        {item.due_date && <p className="text-xs text-muted-foreground">Due {formatDate(item.due_date)}</p>}
      </CardContent>
    </Card>
  );
}
