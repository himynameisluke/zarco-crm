"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { useActionForm } from "@/lib/use-action-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EntityCombobox } from "@/components/ui/entity-combobox";
import { formatDateShort } from "@/lib/format";
import { expandTemplate, type TemplateItemInput } from "@/lib/projects/template";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectTypeValue } from "@/lib/projects/labels";
import { createProjectWizard } from "@/app/(app)/projects/actions";
import { seedProjectTemplates } from "@/app/(app)/projects/actions-detail-extra";

type Option = { id: string; name: string };

export type WizardTemplate = {
  id: string;
  name: string;
  description: string | null;
  projectType: string | null;
  items: TemplateItemInput[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectWizard({
  organizationOptions,
  dealOptions,
  memberOptions,
  templates,
  currentUserId,
  initialOrganizationId,
  initialDealId,
}: {
  organizationOptions: Option[];
  dealOptions: Option[];
  memberOptions: Option[];
  templates: WizardTemplate[];
  currentUserId: string;
  initialOrganizationId?: string;
  initialDealId?: string;
}) {
  const router = useRouter();
  const { state, pending, onSubmit } = useActionForm(createProjectWizard);
  const [seedPending, startSeedTransition] = useTransition();

  const [organizationId, setOrganizationId] = useState<string | null>(
    initialOrganizationId ?? null,
  );
  const [dealId, setDealId] = useState<string | null>(initialDealId ?? null);
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [projectType, setProjectType] = useState<ProjectTypeValue | "">("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [templateId, setTemplateId] = useState<string>("");

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    const parsedStart = startDate ? new Date(startDate) : new Date();
    return expandTemplate(selectedTemplate, selectedTemplate.items, {
      startDate: Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart,
    });
  }, [selectedTemplate, startDate]);

  function seedTemplates() {
    startSeedTransition(async () => {
      await seedProjectTemplates();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Customer ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
          <CardDescription>
            Who this project is being delivered for. Optional — you can link it later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Organization</Label>
            <EntityCombobox
              name="organizationId"
              entityNoun="organization"
              disabled={pending}
              value={organizationId}
              onChange={setOrganizationId}
              items={organizationOptions.map((o) => ({ id: o.id, label: o.name }))}
              placeholder="No organization"
            />
          </div>
          <div className="grid gap-2">
            <Label>Linked deal</Label>
            <EntityCombobox
              name="dealId"
              entityNoun="deal"
              disabled={pending}
              value={dealId}
              onChange={setDealId}
              items={dealOptions.map((d) => ({ id: d.id, label: d.name }))}
              placeholder="No deal"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Details ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required disabled={pending} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectType">Type</Label>
            <Select
              name="projectType"
              value={projectType}
              onValueChange={(v) => setProjectType(v as ProjectTypeValue)}
            >
              <SelectTrigger id="projectType" className="w-full" disabled={pending}>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PROJECT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ownerId">Owner</Label>
            <Select
              name="ownerId"
              value={ownerId}
              onValueChange={(v) => {
                if (typeof v === "string") setOwnerId(v);
              }}
            >
              <SelectTrigger id="ownerId" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} disabled={pending} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="successCriteria">Success criteria</Label>
            <Textarea
              id="successCriteria"
              name="successCriteria"
              rows={2}
              placeholder="What does &ldquo;done&rdquo; look like for this project?"
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Dates ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">Target end</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Template ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Starts the project with a ready-made sequence of phases, milestones and tasks —
            dates resolve against the start date above. Pick blank to build it yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input type="hidden" name="templateId" value={templateId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTemplateId("")}
              disabled={pending}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                templateId === ""
                  ? "border-ring bg-accent"
                  : "border-border hover:bg-muted",
              )}
            >
              <p className="font-medium">Blank project</p>
              <p className="text-xs text-muted-foreground">
                No phases, milestones or tasks yet — add them from the project once created.
              </p>
            </button>
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                disabled={pending}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors",
                  templateId === t.id
                    ? "border-ring bg-accent"
                    : "border-border hover:bg-muted",
                )}
              >
                <p className="font-medium">{t.name}</p>
                {t.description ? (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                ) : null}
              </button>
            ))}
          </div>

          {templates.length === 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">
                This workspace has no templates yet.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={seedPending}
                onClick={seedTemplates}
              >
                {seedPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Add starter templates
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Preview ──────────────────────────────────────────────────── */}
      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              What &ldquo;{selectedTemplate?.name}&rdquo; will create, with dates resolved
              against {startDate ? formatDateShort(startDate) : "today"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.phases.map((phase) => {
              const phaseMilestones = preview.milestones.filter(
                (m) => m.phaseName === phase.name,
              );
              const phaseTasks = preview.tasks.filter((t) => t.phaseName === phase.name);
              return (
                <div key={phase.name} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{phase.name}</p>
                  {phaseTasks.length === 0 && phaseMilestones.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Nothing scheduled.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {phaseTasks.map((t, i) => (
                        <li
                          key={`task-${i}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-foreground">{t.title}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {t.dueAt ? formatDateShort(t.dueAt) : "—"}
                          </span>
                        </li>
                      ))}
                      {phaseMilestones.map((m, i) => (
                        <li
                          key={`milestone-${i}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-medium text-foreground">◆ {m.name}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {m.dueDate ? formatDateShort(m.dueDate) : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" asChild disabled={pending}>
          <Link href="/projects">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create project
        </Button>
      </div>
    </form>
  );
}
