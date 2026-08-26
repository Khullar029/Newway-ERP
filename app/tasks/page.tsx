import { AppShell } from "@/components/app-shell";
import { TaskBoard } from "@/components/task-board";

export default function TasksPage() { return <AppShell><main className="mx-auto max-w-7xl p-4 sm:p-8"><p className="text-sm font-semibold text-steel">WORK MANAGEMENT</p><h1 className="mt-1 text-3xl font-bold">Tasks</h1><p className="mt-1 mb-6 text-sm text-slate-600">Search, filter, and move every deliverable through the agency workflow.</p><TaskBoard/></main></AppShell>; }
