"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useCampaigns } from "@/features/campaigns/use-campaigns";
import { CampaignFormDialog } from "@/features/campaigns/campaign-form-dialog";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges";
import { formatCurrencyINR, formatDate } from "@/lib/utils";

export default function CampaignsPage() {
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: campaigns, isLoading } = useCampaigns({ search: search || undefined });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">{campaigns?.length ?? 0} campaigns</p>
        </div>
        {!readOnly && <Button onClick={() => setDialogOpen(true)}><Plus /> New campaign</Button>}
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search campaigns…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(campaigns ?? []).map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.clients?.name}</p>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5 text-sm">
                  {c.crop && <p className="text-muted-foreground">{c.crop} · {c.region}</p>}
                  <div className="flex flex-wrap gap-1">
                    {c.channels.slice(0, 4).map((ch) => (
                      <span key={ch} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{ch}</span>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Go-live: {formatDate(c.go_live_date)}</span>
                    {c.budget != null && <span>{formatCurrencyINR(c.budget)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(campaigns ?? []).length === 0 && (
            <p className="col-span-full py-10 text-center text-muted-foreground">No campaigns yet.</p>
          )}
        </div>
      )}

      {!readOnly && <CampaignFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
