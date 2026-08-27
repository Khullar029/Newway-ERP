"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useInvoices, useClientFinanceSummaries } from "@/features/finance/use-invoices";
import { InvoiceFormDialog } from "@/features/finance/invoice-form-dialog";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges";
import { formatCurrencyINR, formatDate } from "@/lib/utils";

export default function FinancePage() {
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: invoices, isLoading } = useInvoices();
  const { data: summaries } = useClientFinanceSummaries();

  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = useMemo(() => (invoices ?? []).filter((i) => i.status !== "Paid" && i.due_date && i.due_date < today), [invoices, today]);
  const totalOutstanding = (summaries ?? []).reduce((s, r) => s + (r.outstanding ?? 0), 0);
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of invoices ?? []) {
      if (inv.status === "Draft") continue;
      const month = inv.issue_date.slice(0, 7);
      map[month] = (map[month] ?? 0) + inv.total;
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6);
  }, [invoices]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Finance</h1>
          <p className="text-sm text-muted-foreground">{invoices?.length ?? 0} invoices</p>
        </div>
        {!readOnly && <Button onClick={() => setDialogOpen(true)}><Plus /> New invoice</Button>}
      </div>

      {!readOnly && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader><CardTitle>Total outstanding</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatCurrencyINR(totalOutstanding)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Overdue invoices</CardTitle></CardHeader><CardContent className="text-lg font-semibold text-destructive">{overdueInvoices.length}</CardContent></Card>
          <Card><CardHeader><CardTitle>Clients over credit limit</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{(summaries ?? []).filter((s) => s.credit_limit > 0 && s.outstanding > s.credit_limit).length}</CardContent></Card>
        </div>
      )}

      {!readOnly && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Outstanding by client</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(summaries ?? []).filter((s) => s.outstanding > 0).slice(0, 8).map((s) => (
                <div key={s.client_id} className="flex items-center justify-between text-sm">
                  <span>{s.client_name}</span>
                  <span className={s.credit_limit > 0 && s.outstanding > s.credit_limit ? "font-semibold text-destructive" : ""}>{formatCurrencyINR(s.outstanding)}</span>
                </div>
              ))}
              {(summaries ?? []).filter((s) => s.outstanding > 0).length === 0 && <p className="text-sm text-muted-foreground">Nothing outstanding.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Revenue by month</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {revenueByMonth.map(([month, total]) => (
                <div key={month} className="flex items-center justify-between text-sm">
                  <span>{month}</span>
                  <span>{formatCurrencyINR(total)}</span>
                </div>
              ))}
              {revenueByMonth.length === 0 && <p className="text-sm text-muted-foreground">No invoiced revenue yet.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                {!readOnly && <TableHead>Client</TableHead>}
                <TableHead>Issue date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/finance/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.number}</Link>
                  </TableCell>
                  {!readOnly && <TableCell>{inv.clients?.name}</TableCell>}
                  <TableCell>{formatDate(inv.issue_date)}</TableCell>
                  <TableCell>{formatDate(inv.due_date)}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell>{formatCurrencyINR(inv.total)}</TableCell>
                </TableRow>
              ))}
              {(invoices ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!readOnly && <InvoiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
