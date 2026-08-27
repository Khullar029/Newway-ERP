import { AppShell } from "@/components/layout/app-shell";

// Every page under this group is behind auth and reads live session/data via
// the Supabase browser client, so static prerendering buys nothing — and
// actively breaks the build in any environment without Supabase env vars
// set yet (prerendering executes the client tree, including createClient(),
// on the server at build time).
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
