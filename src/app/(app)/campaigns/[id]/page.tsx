"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/features/campaigns/use-campaigns";
import { CampaignFormDialog } from "@/features/campaigns/campaign-form-dialog";
import { CampaignTimeline } from "@/features/campaigns/campaign-timeline";
import { ApplyPlaybookDialog } from "@/features/playbooks/apply-playbook-dialog";
import { useTasks } from "@/features/tasks/use-tasks";
import { TaskTable } from "@/features/tasks/task-table";
import { TaskFormDialog } from "@/features/tasks/task-form-dialog";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/badges";
import { formatCurrencyINR, formatDate } from "@/lib/utils";
import { Pencil, Rocket, Plus } from "lucide-react";
import type { TaskRow } from "@/features/tasks/use-tasks";

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const { data: campaign, isLoading } = useCampaign(id);
  const { data: tasks } = useTasks({ campaignId: id });
  const [editOpen, setEditOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);

  const { data: content } = useQuery({
    queryKey: ["campaign-content", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").eq("campaign_id", id).order("due_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["campaign-events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").eq("campaign_id", id).order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !campaign) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const allTasks = tasks ?? [];
  const done = allTasks.filter((t) => t.status === "Done").length;
  const progress = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0;

  function openEditTask(t: TaskRow) {
    setEditingTask(t);
    setTaskDialogOpen(true);
  }
  function openNewTask() {
    setEditingTask(null);
    setTaskDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.clients?.name} {campaign.crop && `· ${campaign.crop}`} {campaign.region && `· ${campaign.region}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {campaign.channels.map((c) => (
              <span key={c} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{c}</span>
            ))}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(true)}><Rocket className="h-4 w-4" /> Apply playbook</Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Go-live</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatDate(campaign.go_live_date)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Budget</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{campaign.budget != null ? formatCurrencyINR(campaign.budget) : "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle>Tasks</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{done}/{allTasks.length}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-success" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{progress}% complete</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Launch sprint</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <div className="flex flex-col gap-2">
            {!readOnly && (
              <Button size="sm" variant="outline" className="self-end" onClick={openNewTask}><Plus className="h-3.5 w-3.5" /> Add task</Button>
            )}
            <TaskTable tasks={allTasks} onEdit={openEditTask} readOnly={readOnly} />
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <CampaignTimeline tasks={allTasks} goLiveDate={campaign.go_live_date} />
        </TabsContent>
        <TabsContent value="content">
          <div className="flex flex-col gap-2">
            {(content ?? []).length === 0 && <p className="text-sm text-muted-foreground">No content items linked yet.</p>}
            {(content ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-sm">
                <span>{c.title}</span>
                <StatusBadge status={c.stage} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="calendar">
          <div className="flex flex-col gap-2">
            {(events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No calendar events linked yet.</p>}
            {(events ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-sm">
                <span>{e.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(e.starts_at)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {!readOnly && (
        <>
          <CampaignFormDialog open={editOpen} onOpenChange={setEditOpen} campaign={campaign} />
          <ApplyPlaybookDialog
            open={applyOpen}
            onOpenChange={setApplyOpen}
            clientId={campaign.client_id}
            campaignId={campaign.id}
            defaultAnchorDate={campaign.go_live_date}
          />
          <TaskFormDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            task={editingTask}
            defaultClientId={campaign.client_id}
            defaultCampaignId={campaign.id}
          />
        </>
      )}
    </div>
  );
}
