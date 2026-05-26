import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Layers, MoreHorizontal, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { deals, projects } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { formatDateShort, formatRelative } from "@/lib/format";
import {
  PROJECT_STATUS_ACCENT,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "./schema";

export default async function ProjectsPage() {
  await requireUser();

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      updatedAt: projects.updatedAt,
      dealId: projects.dealId,
      dealName: deals.name,
    })
    .from(projects)
    .leftJoin(deals, eq(projects.dealId, deals.id))
    .orderBy(desc(projects.updatedAt))
    .limit(200);

  const total = rows.length;

  return (
    <>
      <Topbar
        crumbs={[{ icon: Layers, label: "Projects" }]}
        actions={
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={13} />
            New project
          </Link>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Layers}
                title="No projects yet"
                description="Create a project to track post-sale delivery."
                action={
                  <Link href="/projects/new" className="btn btn-primary">
                    <Plus size={13} />
                    New project
                  </Link>
                }
              />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 280 }}>Name</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 240 }}>Linked deal</th>
                  <th style={{ width: 120 }}>Start</th>
                  <th style={{ width: 120 }}>End</th>
                  <th style={{ width: 110, textAlign: "right" }}>Updated</th>
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/projects/${p.id}`}
                        style={{
                          color: "var(--ink)",
                          fontWeight: 450,
                          textDecoration: "none",
                        }}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: PROJECT_STATUS_ACCENT[p.status as ProjectStatus],
                          }}
                        />
                        <span style={{ color: "var(--ink-2)" }}>
                          {PROJECT_STATUS_LABELS[p.status as ProjectStatus]}
                        </span>
                      </span>
                    </td>
                    <td>
                      {p.dealName && p.dealId ? (
                        <Link
                          href={`/deals/${p.dealId}`}
                          style={{
                            color: "var(--ink-2)",
                            textDecoration: "none",
                          }}
                        >
                          {p.dealName}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--ink-4)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="t-mono"
                      style={{ fontSize: 12, color: "var(--ink-3)" }}
                    >
                      {formatDateShort(p.startDate)}
                    </td>
                    <td
                      className="t-mono"
                      style={{ fontSize: 12, color: "var(--ink-3)" }}
                    >
                      {formatDateShort(p.endDate)}
                    </td>
                    <td
                      className="t-mono"
                      style={{
                        textAlign: "right",
                        fontSize: 11.5,
                        color: "var(--ink-3)",
                      }}
                    >
                      {formatRelative(p.updatedAt)}
                    </td>
                    <td>
                      <button
                        type="button"
                        style={{
                          padding: 4,
                          borderRadius: 4,
                          background: "transparent",
                          border: 0,
                          color: "var(--ink-4)",
                          cursor: "pointer",
                        }}
                        aria-label="Row actions"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 16px",
              borderTop: "1px solid var(--hairline)",
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            <span>{total.toLocaleString("en-GB")} project{total === 1 ? "" : "s"}</span>
          </div>
        ) : null}
      </main>
    </>
  );
}
