/**
 * Pure URL-building helper for the /projects list surface. Every control
 * (view tabs, sort headers, filter selects, pagination) reads and writes
 * the same flat set of GET params, so a single "current params + patch"
 * merge function keeps them all consistent instead of five ad-hoc
 * URLSearchParams constructions drifting apart. No React, no db import.
 */

export type ProjectsQueryParams = {
  view?: string;
  q?: string;
  ownerId?: string;
  organizationId?: string;
  status?: string;
  health?: string;
  projectType?: string;
  sort?: string;
  sortDir?: string;
  page?: string;
};

const PARAM_KEYS: (keyof ProjectsQueryParams)[] = [
  "view",
  "q",
  "ownerId",
  "organizationId",
  "status",
  "health",
  "projectType",
  "sort",
  "sortDir",
  "page",
];

/**
 * Merges `patch` over `current` and serializes to a `/projects?...` href.
 * `view` is omitted from the querystring when it's the default ("table")
 * so the plain list keeps a clean URL. Pass `undefined` in `patch` to
 * drop a key entirely (used by filter changes / sort changes to reset
 * pagination back to page 1).
 */
export function projectsHref(
  current: ProjectsQueryParams,
  patch: Partial<Record<keyof ProjectsQueryParams, string | undefined>> = {},
): string {
  const merged: ProjectsQueryParams = { ...current, ...patch };
  const sp = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = merged[key];
    if (!value) continue;
    if (key === "view" && value === "table") continue;
    if (key === "page" && value === "1") continue;
    sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

/** True when any search/filter (not view, sort, or page) is active. */
export function hasActiveFilters(current: ProjectsQueryParams): boolean {
  return Boolean(
    current.q ||
      current.ownerId ||
      current.organizationId ||
      current.status ||
      current.health ||
      current.projectType,
  );
}

/**
 * The CSV export route (`/projects/export`) only understands the search +
 * filter params — no view/sort/page — so it gets its own narrower
 * serializer rather than reusing projectsHref's full param set.
 */
export function projectsExportHref(current: ProjectsQueryParams): string {
  const sp = new URLSearchParams();
  if (current.q) sp.set("q", current.q);
  if (current.ownerId) sp.set("ownerId", current.ownerId);
  if (current.organizationId) sp.set("organizationId", current.organizationId);
  if (current.status) sp.set("status", current.status);
  if (current.health) sp.set("health", current.health);
  if (current.projectType) sp.set("projectType", current.projectType);
  const qs = sp.toString();
  return qs ? `/projects/export?${qs}` : "/projects/export";
}
