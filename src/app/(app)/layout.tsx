import { redirect } from "next/navigation";
import { eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { inboxItems, tasks } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type SidebarCounts } from "@/components/nav/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CommandPaletteLoader } from "@/components/command-palette/loader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userEmail = user.email ?? "unknown@zarco.uk";

  const [inboxCount, openTaskCount] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(inboxItems)
      .where(eq(inboxItems.status, "pending"))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(ne(tasks.status, "done"))
      .then((r) => r[0]?.n ?? 0),
  ]);

  const counts: SidebarCounts = {
    inbox: inboxCount,
    tasks: openTaskCount,
  };

  return (
    <div
      className="crm flex h-screen"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      {/* Desktop sidebar: explicit width + flex-shrink so it can't collapse
          when the flex container is at viewport width.
          Visible at sm (>=640px), not lg (>=1024px). Most laptop / split-
          screen / tablet widths keep the sidebar permanently visible like
          Vercel + Linear. Hamburger drawer is a true-phone fallback only. */}
      <div
        className="hidden sm:block h-full"
        style={{ width: 232, flexShrink: 0 }}
      >
        <Sidebar userEmail={userEmail} counts={counts} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      <CommandPaletteLoader />
      <Toaster />
    </div>
  );
}
