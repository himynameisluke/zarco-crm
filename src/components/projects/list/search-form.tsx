import { Search } from "lucide-react";

import type { ProjectsQueryParams } from "./url";

/**
 * Plain GET form (contacts precedent) — works with JS disabled, produces
 * a real bookmarkable URL. Carries the other active filters as hidden
 * inputs so submitting a new search doesn't silently clear owner/org/
 * status/health/type filters the user already set.
 */
export function SearchForm({ current, total }: { current: ProjectsQueryParams; total: number }) {
  return (
    <form method="get" action="/projects" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {current.ownerId ? <input type="hidden" name="ownerId" value={current.ownerId} /> : null}
      {current.organizationId ? (
        <input type="hidden" name="organizationId" value={current.organizationId} />
      ) : null}
      {current.status ? <input type="hidden" name="status" value={current.status} /> : null}
      {current.health ? <input type="hidden" name="health" value={current.health} /> : null}
      {current.projectType ? <input type="hidden" name="projectType" value={current.projectType} /> : null}
      {current.sort ? <input type="hidden" name="sort" value={current.sort} /> : null}
      {current.sortDir ? <input type="hidden" name="sortDir" value={current.sortDir} /> : null}
      <div className="input" style={{ width: 240 }}>
        <Search size={13} color="var(--ink-4)" />
        <input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder={`Search ${total.toLocaleString("en-GB")} project${total === 1 ? "" : "s"}…`}
        />
      </div>
    </form>
  );
}
