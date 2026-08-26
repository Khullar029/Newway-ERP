"use client";

import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIntegrations, useToggleIntegration } from "./use-integrations";
import type { IntegrationProvider } from "@/types/database";

const PROVIDERS: { id: IntegrationProvider; name: string; description: string }[] = [
  { id: "google", name: "Google Calendar / Drive", description: "Sync meetings and go-lives, attach Drive files to campaigns and content." },
  { id: "meta", name: "Meta Marketing API", description: "Pull campaign spend and lead counts into the campaign record (read-only KPIs)." },
  { id: "whatsapp", name: "WhatsApp Cloud API", description: "Send broadcast/template messages tied to a campaign and log sends." },
  { id: "voice_ai", name: "Voice AI", description: "Trigger auto-calls to a lead list; receive call outcomes back as activity." },
];

export function IntegrationsPanel() {
  const { data: integrations } = useIntegrations();
  const toggle = useToggleIntegration();

  function statusFor(id: IntegrationProvider) {
    return integrations?.find((i) => i.provider === id)?.status ?? "disconnected";
  }

  async function handleToggle(id: IntegrationProvider) {
    const connected = statusFor(id) === "connected";
    try {
      await toggle.mutateAsync({ provider: id, connect: !connected });
      toast.success(connected ? "Disconnected" : "Connected (stub) — see supabase/functions for the real handshake");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PROVIDERS.map((p) => {
        const status = statusFor(p.id);
        return (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{p.name}</CardTitle>
                <Badge variant={status === "connected" ? "success" : "muted"}>{status}</Badge>
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant={status === "connected" ? "outline" : "default"} size="sm" onClick={() => handleToggle(p.id)} disabled={toggle.isPending}>
                {status === "connected" ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
