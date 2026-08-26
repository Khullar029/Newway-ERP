"use client";

import { use, useState } from "react";
import { useInvoice, useUpdateInvoiceStatus } from "@/features/finance/use-invoices";
import { PaymentFormDialog } from "@/features/finance/payment-form-dialog";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/badges";
import { formatCurrencyINR, formatDate } from "@/lib/utils";
import { Printer, Plus } from "lucide-react";
import type { InvoiceStatus } from "@/types/database";

const STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Partial", "Paid", "Overdue"];

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useInvoice(id);
  const { data: profile } = useProfile();
  const readOnly = profile?.role === "Client";
  const updateStatus = useUpdateInvoiceStatus();
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const { invoice, items, payments } = data;
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Invoice {invoice.number}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save as PDF</Button>
          {!readOnly && <Button onClick={() => setPaymentOpen(true)}><Plus className="h-4 w-4" /> Record payment</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Newway Agri</CardTitle>
              <p className="text-xs text-muted-foreground">Marketing services invoice</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{invoice.number}</p>
              {readOnly ? (
                <StatusBadge status={invoice.status} />
              ) : (
                <Select value={invoice.status} onValueChange={(v) => updateStatus.mutate({ id: invoice.id, status: v as InvoiceStatus })}>
                  <SelectTrigger className="mt-1 h-7 w-28 text-xs print:hidden"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-muted-foreground">Bill to</p><p className="font-medium">{invoice.clients?.name}</p></div>
            <div><p className="text-muted-foreground">Issue date</p><p className="font-medium">{formatDate(invoice.issue_date)}</p></div>
            <div><p className="text-muted-foreground">Due date</p><p className="font-medium">{formatDate(invoice.due_date)}</p></div>
          </div>

          <Table>
            <TableHeader>
              <TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Unit price</TableHead><TableHead>Amount</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.qty}</TableCell>
                  <TableCell>{formatCurrencyINR(it.unit_price)}</TableCell>
                  <TableCell>{formatCurrencyINR(it.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex w-48 justify-between"><span>Subtotal</span><span>{formatCurrencyINR(invoice.subtotal)}</span></div>
            <div className="flex w-48 justify-between"><span>Tax</span><span>{formatCurrencyINR(invoice.tax)}</span></div>
            <div className="flex w-48 justify-between font-semibold"><span>Total</span><span>{formatCurrencyINR(invoice.total)}</span></div>
            <div className="flex w-48 justify-between text-success"><span>Paid</span><span>{formatCurrencyINR(paidTotal)}</span></div>
            <div className="flex w-48 justify-between font-semibold"><span>Balance</span><span>{formatCurrencyINR(invoice.total - paidTotal)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>{formatDate(p.paid_on)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
              <span className="font-medium">{formatCurrencyINR(p.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {!readOnly && (
        <PaymentFormDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          invoiceId={invoice.id}
          clientId={invoice.client_id}
          invoiceTotal={invoice.total}
          alreadyPaid={paidTotal}
        />
      )}
    </div>
  );
}
