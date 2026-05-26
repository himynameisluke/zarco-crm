import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userEmail = user.email ?? "unknown@zarco.uk";

  return (
    <div
      className="crm flex h-screen"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <div className="hidden lg:block h-full">
        <Sidebar userEmail={userEmail} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
