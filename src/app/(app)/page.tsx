import { requireUser } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function HomePage() {
  const user = await requireUser();
  return <Dashboard userEmail={user.email ?? "guest@zarco.uk"} />;
}
