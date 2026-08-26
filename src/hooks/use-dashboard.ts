"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "./use-profile";
import type { PriorityLevel, TaskStatus } from "@/types/database";

interface DashboardTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: PriorityLevel;
  due_date: string | null;
  lane_id: string | null;
  client_id: string;
  lanes: { name: string } | null;
}

interface MyTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: PriorityLevel;
  due_date: string | null;
  client_id: string;
  clients: { name: string } | null;
}

interface UpcomingCampaign {
  id: string;
  name: string;
  go_live_date: string | null;
  status: string;
  clients: { name: string } | null;
}

export function useDashboard() {
  const supabase = createClient();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["dashboard", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const isInternal = profile!.role !== "Client";
      const today = new Date().toISOString().slice(0, 10);
      const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [tasksRes, clientsRes, campaignsRes, financeRes, activityRes, weekEventsRes, myTasksRes] = await Promise.all([
        supabase.from("tasks").select("id, title, status, priority, due_date, lane_id, client_id, lanes(name)"),
        isInternal ? supabase.from("clients").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 } as { count: number }),
        supabase
          .from("campaigns")
          .select("id, name, go_live_date, status, clients(name)")
          .not("go_live_date", "is", null)
          .gte("go_live_date", today)
          .order("go_live_date", { ascending: true })
          .limit(5),
        supabase.from("client_finance_summary").select("outstanding"),
        isInternal
          ? supabase.from("activity_log").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8)
          : Promise.resolve({ data: [] as { id: string; action: string; entity_type: string; created_at: string }[] }),
        supabase.from("calendar_events").select("id, title, type, starts_at").gte("starts_at", today).lte("starts_at", weekAhead + "T23:59:59"),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, client_id, clients(name)")
          .eq("assignee_id", profile!.id)
          .neq("status", "Done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8),
      ]);

      const tasks = (tasksRes.data ?? []) as unknown as DashboardTask[];
      const upcomingGoLives = (campaignsRes.data ?? []) as unknown as UpcomingCampaign[];
      const myTasks = (myTasksRes.data ?? []) as unknown as MyTask[];
      const openTasks = tasks.filter((t) => t.status !== "Done");
      const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
      const highPriorityOpen = openTasks.filter((t) => t.priority === "High");
      const inProgress = tasks.filter((t) => t.status === "In Progress");

      const byStatus: Record<string, number> = {};
      const byLane: Record<string, number> = {};
      for (const t of tasks) {
        byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
        const laneName = t.lanes?.name ?? "Unassigned";
        byLane[laneName] = (byLane[laneName] ?? 0) + 1;
      }

      const outstanding = (financeRes.data ?? []).reduce((sum, r) => sum + (r.outstanding ?? 0), 0);

      return {
        totalClients: clientsRes.count ?? 0,
        openTasksCount: openTasks.length,
        overdueCount: overdue.length,
        highPriorityOpenCount: highPriorityOpen.length,
        inProgressCount: inProgress.length,
        byStatus,
        byLane,
        outstanding,
        upcomingGoLives,
        recentActivity: activityRes.data ?? [],
        weekEvents: weekEventsRes.data ?? [],
        myTasks,
        isInternal,
      };
    },
  });
}
