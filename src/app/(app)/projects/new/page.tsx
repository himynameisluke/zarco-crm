import { desc, eq } from "drizzle-orm";
import { Layers } from "lucide-react";

import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { ProjectForm } from "@/components/projects/project-form";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const dealOptions = await db
    .select({ id: deals.id, name: deals.name })
    .from(deals)
    .where(eq(deals.workspaceId, workspace.id))
    .orderBy(desc(deals.updatedAt))
    .limit(200);

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ProjectForm
            action={createProject}
            dealOptions={dealOptions}
            cancelHref="/projects"
          />
        </div>
      </main>
    </>
  );
}
