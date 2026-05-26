import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Layers } from "lucide-react";

import { db } from "@/lib/db";
import { deals, projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { ProjectForm } from "@/components/projects/project-form";
import { updateProject } from "../../actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [project, dealOptions] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, id)).limit(1).then((r) => r[0]),
    db
      .select({ id: deals.id, name: deals.name })
      .from(deals)
      .orderBy(desc(deals.updatedAt))
      .limit(200),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Layers, label: "Projects" },
          { label: project.name, href: `/projects/${id}` },
          { label: "Edit" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ProjectForm
            action={updateProject.bind(null, id)}
            defaultValues={project}
            dealOptions={dealOptions}
            submitLabel="Save changes"
            cancelHref={`/projects/${id}`}
          />
        </div>
      </main>
    </>
  );
}
