"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/features/clients/use-clients";
import { useCreateInvoice } from "./use-invoices";
import { formatCurrencyINR } from "@/lib/utils";

interface LineItem {
  description: string;
  qty: string;
  unit_price: string;
}

export function InvoiceFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: clients } = useClients();
  const create = useCreateInvoice();

  const [clientId, setClientId] = useState("");
  const [number, setNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: "1", unit_price: "0" }]);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unit_price: "0" }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return toast.error("Client is required");
    if (!number.trim()) return toast.error("Invoice number is required");
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) return toast.error("Add at least one line item");

    try {
      await create.mutateAsync({
        invoice: { client_id: clientId, number: number.trim(), issue_date: issueDate, due_date: dueDate || null, status: "Draft" },
        items: validItems.map((i) => ({ description: i.description, qty: Number(i.qty) || 1, unit_price: Number(i.unit_price) || 0 })),
      });
      toast.success("Invoice created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5"><Label>Number</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Issue date</Label><Input type="date" className="w-40" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>

          <div className="flex flex-col gap-2">
            <Label>Line items</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input placeholder="Description" className="flex-1" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                <Input type="number" min="0" placeholder="Qty" className="w-20" value={item.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} />
                <Input type="number" min="0" placeholder="Unit price" className="w-28" value={item.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} />
                <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add line</Button>
          </div>

          <div className="flex justify-end text-sm font-semibold">Total: {formatCurrencyINR(total)}</div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create invoice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
