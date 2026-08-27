"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { useUpdateProfile } from "./use-users";

export function ProfilePanel() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");

  async function handleSave() {
    if (!profile) return;
    try {
      await update.mutateAsync({ id: profile.id, full_name: fullName });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!profile) return null;

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Email</Label>
        <Input value={profile.email ?? ""} disabled />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Role</Label>
        <Badge variant="secondary" className="w-fit">{profile.role}</Badge>
      </div>
      <Button className="w-fit" onClick={handleSave} disabled={update.isPending}>Save changes</Button>
    </div>
  );
}
