"use client";

import { useProfile } from "@/hooks/use-profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePanel } from "@/features/settings/profile-panel";
import { UsersPanel } from "@/features/settings/users-panel";
import { IntegrationsPanel } from "@/features/settings/integrations-panel";

export default function SettingsPage() {
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === "Admin";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile"><ProfilePanel /></TabsContent>
        {isAdmin && <TabsContent value="users"><UsersPanel /></TabsContent>}
        {isAdmin && <TabsContent value="integrations"><IntegrationsPanel /></TabsContent>}
      </Tabs>
    </div>
  );
}
