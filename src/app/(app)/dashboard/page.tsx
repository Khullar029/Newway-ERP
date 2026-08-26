"use client";

import Link from "next/link";
import { useDashboard } from "@/hooks/use-dashboard";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR, formatDate } from "@/lib/utils";
import { Building2, ListChecks, AlertTriangle, Flame, Loader2, Wallet, Rocket, Activity } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: profile } = useProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across Newway Agri today.</p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.isInternal && <Kpi icon={Building2} label="Total clients" value={data.totalClients} />}
            <Kpi icon={ListChecks} label="Open tasks" value={data.openTasksCount} />
            <Kpi icon={AlertTriangle} label="Overdue" value={data.overdueCount} tone="warning" />
            <Kpi icon={Flame} label="High priority open" value={data.highPriorityOpenCount} tone="destructive" />
            <Kpi icon={Loader2} label="In progress" value={data.inProgressCount} />
            <Kpi icon={Rocket} label="Upcoming go-lives" value={data.upcomingGoLives.length} />
            <Kpi icon={Wallet} label="Outstanding" value={formatCurrencyINR(data.outstanding)} />
            <Kpi icon={Activity} label="This week's events" value={data.weekEvents.length} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Tasks by lane</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Object.entries(data.byLane).length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
                {Object.entries(data.byLane)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lane, count]) => (
                    <div key={lane} className="flex items-center justify-between text-sm">
                      <span>{lane}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>My tasks</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.myTasks.length === 0 && <p className="text-sm text-muted-foreground">Nothing assigned to you.</p>}
                {data.myTasks.map((t) => (
                  <Link key={t.id} href="/tasks" className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(t.due_date)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Upcoming go-lives</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.upcomingGoLives.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
                {data.upcomingGoLives.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <span className="truncate">
                      {c.name} <span className="text-muted-foreground">— {c.clients?.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.go_live_date)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {data.isInternal && (
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize">
                      {a.action} · {a.entity_type}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            tone === "warning" ? "bg-warning/15 text-warning" : tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-accent text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
