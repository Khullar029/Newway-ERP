import {
  LayoutDashboard,
  Building2,
  Megaphone,
  ListChecks,
  Clapperboard,
  CalendarDays,
  Wallet,
  BookOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Team", "Client"] },
  { href: "/clients", label: "Clients", icon: Building2, roles: ["Admin", "Team"] },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, roles: ["Admin", "Team", "Client"] },
  { href: "/tasks", label: "Tasks", icon: ListChecks, roles: ["Admin", "Team", "Client"] },
  { href: "/content", label: "Content", icon: Clapperboard, roles: ["Admin", "Team", "Client"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["Admin", "Team", "Client"] },
  { href: "/finance", label: "Finance", icon: Wallet, roles: ["Admin", "Team", "Client"] },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen, roles: ["Admin", "Team"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["Admin", "Team", "Client"] },
];
