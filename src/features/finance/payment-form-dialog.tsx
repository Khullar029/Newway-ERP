"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecordPayment } from "./use-invoices";

export function PaymentFormDialog({
  open,
  onOpenChange,
  invoiceId,
  clientId,
  invoiceTotal,
  alreadyPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  clientId: string;
  invoiceTotal: number;
  alreadyPaid: number;
}) {
  const record = useRecordPayment();
  const [amount, setAmount] = useState(String(Math.max(invoiceTotal - alreadyPaid, 0)));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    try {
      await record.mutateAsync({
        invoice_id: invoiceId,
        client_id: clientId,
        amount: amt,
        paid_on: paidOn,
        method,
        reference: reference || null,
        invoiceTotal,
        alreadyPaid,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label>Amount (INR)</Label><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Paid on</Label><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Method</Label><Input value={method} onChange={(e) => setMethod(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>Record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
