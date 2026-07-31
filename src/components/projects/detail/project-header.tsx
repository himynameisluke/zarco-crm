"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Loader2, Pencil, User as UserIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateShort } from "@/lib/format";
import {
  PROJECT_HEALTHS,
  PROJECT_HEALTH_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectHealthLabelValue,
  type ProjectStatusValue,
} from "@/lib/projects/labels";
import { isHealthAdvisoryWorse } from "@/lib/projects/health";
import { patchProjectField } from "@/app/(app)/projects/actions-detail-extra";
import { HealthAdvisoryChip } from "./badges";
import type { MemberOption, ProjectAdvisories, ProjectDetailData, ProjectPhaseRow } from "./types";

function useFieldPatch(projectId: string) {
  const [pending, startTransition] = useTransition();
  function patch(fields: Record<string, string | null>) {
    startTransition(async () => {
      const result = await patchProjectField(projectId, fields);
      if (result && "error" in result && result.error) toast.error(result.error);
    });
  }
  return { pending, patch };
}

function PhaseStepper({
  phases,
  currentPhaseId,
  isCompleted,
  disabled,
  onSelect,
}: {
  phases: ProjectPhaseRow[];
  currentPhaseId: string | null;
  isCompleted: boolean;
  disabled: boolean;
  onSelect: (phaseId: string | null) => void;
}) {
  if (isCompleted) {
    return (
      <span
        style={{
          fontSize: 11.5,
          color: "var(--success)",
          fontWeight: 500,
        }}
      >
        Complete
      </span>
    );
  }

  if (phases.length === 0) {
    return (
      <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>
        No phases yet — add from a template, or use tasks directly.
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {phases.map((phase, i) => {
        const active = phase.id === currentPhaseId;
        return (
          <button
            key={phase.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(active ? null : phase.id)}
            title={active ? "Click to unset" : `Set current phase to ${phase.name}`}
            style={{
              fontSize: 11.5,
              padding: "3px 9px",
              borderRadius: 999,
              border: active ? "1px solid var(--magenta)" : "1px solid var(--ink-20)",
              background: active ? "var(--magenta-wash)" : "transparent",
              color: active ? "var(--magenta-ink)" : "var(--ink-60)",
              fontWeight: active ? 600 : 500,
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {i + 1}. {phase.name}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({
  progress,
  manual,
  disabled,
  onSetManual,
  onClear,
}: {
  progress: number | null;
  manual: number | null;
  disabled: boolean;
  onSetManual: (value: number) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(manual ?? progress ?? 0));
  const pct = progress ?? 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, color: "var(--ink-40)" }}>
          Progress {manual != null ? "(manual override)" : "(from tasks)"}
        </span>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-6 w-16 text-xs"
              disabled={disabled}
            />
            <Button
              type="button"
              size="xs"
              disabled={disabled}
              onClick={() => {
                const n = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
                onSetManual(n);
                setEditing(false);
              }}
            >
              Save
            </Button>
            {manual != null ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  onClear();
                  setEditing(false);
                }}
              >
                Clear
              </Button>
            ) : null}
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setValue(String(manual ?? progress ?? 0));
              setEditing(true);
            }}
            disabled={disabled}
            style={{
              fontSize: 11,
              color: "var(--ink-40)",
              background: "transparent",
              border: 0,
              cursor: disabled ? "default" : "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Override
          </button>
        )}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--paper-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--magenta)",
            borderRadius: 999,
            transition: "width .2s ease-out",
          }}
        />
      </div>
      <span className="t-num" style={{ fontSize: 11, color: "var(--ink-60)" }}>
        {progress == null ? "—" : `${progress}%`}
      </span>
    </div>
  );
}

export function ProjectHeader({
  project,
  organization,
  phases,
  members,
  progress,
  advisories,
}: {
  project: ProjectDetailData["project"];
  organization: ProjectDetailData["organization"];
  phases: ProjectPhaseRow[];
  members: MemberOption[];
  progress: number | null;
  advisories: ProjectAdvisories;
}) {
  const { pending, patch } = useFieldPatch(project.id);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [endDate, setEndDate] = useState(project.endDate ?? "");

  const advisoryWorse = isHealthAdvisoryWorse(
    project.health as ProjectHealthLabelValue,
    advisories.suggestedHealth,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {organization ? (
          <Link
            href={`/organizations/${organization.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            <Building2 className="h-3.5 w-3.5" />
            {organization.name}
          </Link>
        ) : null}
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        <div className="flex-1" />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${project.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select
            value={project.status}
            onValueChange={(v) => {
              if (typeof v === "string") patch({ status: v as ProjectStatusValue });
            }}
            items={PROJECT_STATUS_LABELS}
          >
            <SelectTrigger size="sm" disabled={pending} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Health</span>
          <Select
            value={project.health}
            onValueChange={(v) => {
              if (typeof v === "string") patch({ health: v as ProjectHealthLabelValue });
            }}
            items={PROJECT_HEALTH_LABELS}
          >
            <SelectTrigger size="sm" disabled={pending} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_HEALTHS.map((h) => (
                <SelectItem key={h} value={h}>
                  {PROJECT_HEALTH_LABELS[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {advisoryWorse ? (
          <HealthAdvisoryChip
            suggested={advisories.suggestedHealth}
            reasons={advisories.advisories.map((a) => a.label)}
          />
        ) : null}
      </div>

      <PhaseStepper
        phases={phases}
        currentPhaseId={project.currentPhaseId}
        isCompleted={project.status === "completed"}
        disabled={pending}
        onSelect={(phaseId) => patch({ currentPhaseId: phaseId })}
      />

      <div className="max-w-sm">
        <ProgressBar
          progress={progress}
          manual={project.progressManual}
          disabled={pending}
          onSetManual={(v) => patch({ progressManual: String(v) })}
          onClear={() => patch({ progressManual: "" })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserIcon className="h-3 w-3" />
            Owner
          </span>
          <Select
            value={project.ownerId ?? ""}
            onValueChange={(v) => {
              if (typeof v === "string") patch({ ownerId: v });
            }}
            items={members.map((m) => ({ value: m.id, label: m.name }))}
          >
            <SelectTrigger size="sm" disabled={pending} className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Start</span>
          <Input
            type="date"
            value={startDate}
            disabled={pending}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={() => {
              if (startDate !== (project.startDate ?? "")) patch({ startDate });
            }}
            className="h-7 text-xs"
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Target end</span>
          <Input
            type="date"
            value={endDate}
            disabled={pending}
            onChange={(e) => setEndDate(e.target.value)}
            onBlur={() => {
              if (endDate !== (project.endDate ?? "")) patch({ endDate });
            }}
            className="h-7 text-xs"
          />
        </div>
      </div>
      {project.endDate && project.status !== "completed" ? (
        <p className="text-xs text-muted-foreground">
          Target: {formatDateShort(project.endDate)}
        </p>
      ) : null}
    </div>
  );
}
