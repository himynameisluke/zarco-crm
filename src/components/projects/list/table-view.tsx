import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Plus,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { colorFromString } from "@/lib/colors";
import { formatDateShort, formatRelative, getInitials } from "@/lib/format";
import type { ListProjectsRow } from "@/lib/projects/queries";
import { PROJECT_HEALTH_LABELS, PROJECT_TYPE_LABELS, PROJECT_TYPES, type ProjectHealthLabelValue } from "@/lib/projects/labels";
import {
  PROJECT_STATUS_ACCENT,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/app/(app)/projects/schema";
import type { WorkspaceMember } from "@/lib/workspace/members";
import { FilterSelect } from "./filter-select";
import { SearchForm } from "./search-form";
import { ProgressBar } from "./progress-bar";
import { hasActiveFilters, projectsExportHref, projectsHref, type ProjectsQueryParams } from "./url";

const HEALTH_DOT_CLASS: Record<ProjectHealthLabelValue, string> = {
  on_track: "dot --ok",
  at_risk: "dot --warn",
  off_track: "dot --danger",
};

const PAGE_SIZE = 50;

type SortField = "name" | "target_date" | "progress" | "last_activity";

const SORT_HEADERS: { field: SortField; label: string; width: number }[] = [
  { field: "name", label: "Name", width: 220 },
];

function daysRemaining(endDate: string | null): { label: string; tone: "default" | "warn" | "danger" } {
  if (!endDate) return { label: "—", tone: "default" };
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: "danger" };
  if (diffDays === 0) return { label: "Due today", tone: "warn" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, tone: "warn" };
  return { label: `${diffDays}d left`, tone: "default" };
}

function daysChipStyle(tone: "default" | "warn" | "danger") {
  if (tone === "danger") {
    return { color: "var(--danger)", background: "var(--danger-wash)", border: "1px solid var(--danger-edge)" };
  }
  if (tone === "warn") {
    return { color: "var(--warning)", background: "var(--warning-wash)", border: "1px solid var(--warning-edge)" };
  }
  return { color: "var(--ink-60)", background: "var(--paper-3)", border: "1px solid var(--ink-20)" };
}

function SortHeader({
  field,
  label,
  width,
  current,
}: {
  field: SortField;
  label: string;
  width: number;
  current: ProjectsQueryParams;
}) {
  const active = current.sort === field;
  const dir = active ? (current.sortDir === "asc" ? "asc" : "desc") : undefined;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  return (
    <th style={{ width }}>
      <Link
        href={projectsHref(current, { sort: field, sortDir: nextDir, page: undefined })}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: active ? "var(--ink-2)" : "inherit",
          textDecoration: "none",
        }}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={10} />
          ) : (
            <ArrowDown size={10} />
          )
        ) : (
          <ArrowUpDown size={10} style={{ opacity: 0.35 }} />
        )}
      </Link>
    </th>
  );
}

export function TableView({
  rows,
  total,
  page,
  current,
  organizations,
  members,
}: {
  rows: ListProjectsRow[];
  total: number;
  page: number;
  current: ProjectsQueryParams;
  organizations: { id: string; name: string }[];
  members: WorkspaceMember[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtersActive = hasActiveFilters(current);

  return (
    <>
      {/* Toolbar — GET-form search + select filters, all reflected in the URL. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--hairline)",
          flexWrap: "wrap",
        }}
      >
        <SearchForm current={current} total={total} />
        <FilterSelect
          paramKey="ownerId"
          value={current.ownerId}
          placeholder="Owner"
          current={current}
          options={members.map((m) => ({ value: m.id, label: m.name }))}
        />
        <FilterSelect
          paramKey="organizationId"
          value={current.organizationId}
          placeholder="Customer"
          current={current}
          options={organizations.map((o) => ({ value: o.id, label: o.name }))}
        />
        <FilterSelect
          paramKey="status"
          value={current.status}
          placeholder="Status"
          current={current}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))}
        />
        <FilterSelect
          paramKey="health"
          value={current.health}
          placeholder="Health"
          current={current}
          options={Object.entries(PROJECT_HEALTH_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          paramKey="projectType"
          value={current.projectType}
          placeholder="Type"
          current={current}
          options={PROJECT_TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABELS[t] }))}
        />
        {filtersActive ? (
          <Link href="/projects" className="btn btn-ghost btn-sm">
            Clear filters
          </Link>
        ) : null}
        <div style={{ flex: 1 }} />
        <a href={projectsExportHref(current)} className="btn btn-sm">
          <Download size={12} />
          Export CSV
        </a>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              icon={Layers}
              title={filtersActive ? "No projects match these filters" : "No projects yet"}
              description={
                filtersActive
                  ? "Try a different search term, or clear a filter."
                  : "Create a project to track post-sale delivery."
              }
              action={
                filtersActive ? (
                  <Link href="/projects" className="btn">
                    Clear filters
                  </Link>
                ) : (
                  <Link href="/projects/new" className="btn btn-primary">
                    <Plus size={13} />
                    New project
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  {SORT_HEADERS.map((h) => (
                    <SortHeader key={h.field} field={h.field} label={h.label} width={h.width} current={current} />
                  ))}
                  <th style={{ width: 160 }}>Customer</th>
                  <th style={{ width: 150 }}>Owner</th>
                  <th style={{ width: 130 }}>Phase</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 110 }}>Health</th>
                  <SortHeader field="progress" label="Progress" width={150} current={current} />
                  <th style={{ width: 90 }}>Start</th>
                  <SortHeader field="target_date" label="Target" width={90} current={current} />
                  <th style={{ width: 110 }}>Remaining</th>
                  <th style={{ width: 90, textAlign: "right" }}>Open tasks</th>
                  <th style={{ width: 90, textAlign: "right" }}>Blockers</th>
                  <SortHeader field="last_activity" label="Last activity" width={110} current={current} />
                  <th style={{ width: 32 }} aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const orgColor = colorFromString(p.organizationName ?? p.organizationId);
                  const remaining = daysRemaining(p.endDate);
                  const status = p.status as ProjectStatus;
                  const health = p.health as ProjectHealthLabelValue;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/projects/${p.id}`}
                          style={{ color: "var(--ink)", fontWeight: 450, textDecoration: "none" }}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        {p.organizationName && p.organizationId ? (
                          <Link
                            href={`/organizations/${p.organizationId}`}
                            style={{ display: "flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: orgColor }} />
                            <span className="truncate" style={{ color: "var(--ink-2)" }}>
                              {p.organizationName}
                            </span>
                          </Link>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.ownerName ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="zk-avatar" style={{ width: 18, height: 18, fontSize: 9 }}>
                              {getInitials(...p.ownerName.split(" "))}
                            </span>
                            <span className="truncate" style={{ color: "var(--ink-2)" }}>
                              {p.ownerName}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {p.currentPhaseName ? (
                          <span style={{ color: "var(--ink-2)" }}>{p.currentPhaseName}</span>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>Unphased</span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: PROJECT_STATUS_ACCENT[status],
                            }}
                          />
                          <span style={{ color: "var(--ink-2)" }}>{PROJECT_STATUS_LABELS[status]}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span className={HEALTH_DOT_CLASS[health]} />
                          <span style={{ color: "var(--ink-2)" }}>{PROJECT_HEALTH_LABELS[health]}</span>
                        </span>
                      </td>
                      <td>
                        <ProgressBar value={p.progress} />
                      </td>
                      <td className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        {formatDateShort(p.startDate)}
                      </td>
                      <td className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        {formatDateShort(p.endDate)}
                      </td>
                      <td>
                        <span
                          className="t-mono"
                          style={{ fontSize: 10.5, padding: "2px 6px", borderRadius: 3, ...daysChipStyle(remaining.tone) }}
                        >
                          {remaining.label}
                        </span>
                      </td>
                      <td className="t-mono" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-2)" }}>
                        {p.openTaskCount}
                      </td>
                      <td
                        className="t-mono"
                        style={{
                          textAlign: "right",
                          fontSize: 12.5,
                          color: p.blockerCount > 0 ? "var(--danger)" : "var(--ink-4)",
                        }}
                      >
                        {p.blockerCount}
                      </td>
                      <td className="t-mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {p.lastActivityAt ? formatRelative(p.lastActivityAt) : formatRelative(p.updatedAt)}
                      </td>
                      <td>
                        <RowActionsMenu viewHref={`/projects/${p.id}`} editHref={`/projects/${p.id}/edit`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 0 ? (
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
          <span>
            Showing {from}–{to} of {total.toLocaleString("en-GB")}
          </span>
          <div style={{ flex: 1 }} />
          {page > 1 ? (
            <Link
              href={projectsHref(current, { page: String(page - 1) })}
              className="btn btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft size={11} />
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              <ChevronLeft size={11} />
            </button>
          )}
          <span className="t-mono" style={{ fontSize: 10.5 }}>
            PAGE {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={projectsHref(current, { page: String(page + 1) })}
              className="btn btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight size={11} />
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" disabled>
              <ChevronRight size={11} />
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
