"use client";

import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectsHref, type ProjectsQueryParams } from "./url";

const ALL_VALUE = "__all__";

type FilterKey = "ownerId" | "organizationId" | "status" | "health" | "projectType";

/**
 * One filter dropdown. Selecting a value navigates to the same URL shape
 * every other control on this page uses (projectsHref) — the filter is
 * GET-param state, not client state, it just changes via a select instead
 * of a page reload. Mirrors the app's existing DealStageSelect pattern
 * (Select + a value-change side effect) rather than inventing a new
 * control type.
 */
export function FilterSelect({
  paramKey,
  value,
  options,
  placeholder,
  current,
}: {
  paramKey: FilterKey;
  value: string | undefined;
  options: { value: string; label: string }[];
  placeholder: string;
  current: ProjectsQueryParams;
}) {
  const router = useRouter();

  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        const nextValue = next === ALL_VALUE ? undefined : next;
        router.push(projectsHref(current, { [paramKey]: nextValue, page: undefined }));
      }}
    >
      <SelectTrigger size="sm" className="h-8 w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
