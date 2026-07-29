"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useActionForm } from "@/lib/use-action-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityCombobox } from "@/components/ui/entity-combobox";
import {
  PROJECT_HEALTHS,
  PROJECT_HEALTH_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
} from "@/lib/projects/labels";
import type { MemberOption, ProjectDetailData, ProjectPhaseRow } from "./types";

type Option = { id: string; name: string };

export function ProjectEditForm({
  action,
  project,
  organizationOptions,
  dealOptions,
  memberOptions,
  phases,
}: {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  project: ProjectDetailData["project"];
  organizationOptions: Option[];
  dealOptions: Option[];
  memberOptions: MemberOption[];
  phases: ProjectPhaseRow[];
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const [organizationId, setOrganizationId] = useState<string | null>(project.organizationId);
  const [dealId, setDealId] = useState<string | null>(project.dealId);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={project.name} disabled={pending} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={project.status}>
              <SelectTrigger id="status" className="w-full" disabled={pending}>
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
          <div className="grid gap-2">
            <Label htmlFor="health">Health</Label>
            <Select name="health" defaultValue={project.health}>
              <SelectTrigger id="health" className="w-full" disabled={pending}>
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
          <div className="grid gap-2">
            <Label htmlFor="projectType">Type</Label>
            <Select name="projectType" defaultValue={project.projectType ?? ""}>
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
            <Select name="ownerId" defaultValue={project.ownerId ?? ""}>
              <SelectTrigger id="ownerId" className="w-full" disabled={pending}>
                <SelectValue placeholder="Unassigned" />
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
          {phases.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="currentPhaseId">Current phase</Label>
              <Select name="currentPhaseId" defaultValue={project.currentPhaseId ?? ""}>
                <SelectTrigger id="currentPhaseId" className="w-full" disabled={pending}>
                  <SelectValue placeholder="Unphased" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="progressManual">Progress override</Label>
            <Input
              id="progressManual"
              name="progressManual"
              type="number"
              min={0}
              max={100}
              placeholder="Computed from tasks"
              defaultValue={project.progressManual ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={project.description ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="successCriteria">Success criteria</Label>
            <Textarea
              id="successCriteria"
              name="successCriteria"
              rows={2}
              defaultValue={project.successCriteria ?? ""}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer &amp; dates</CardTitle>
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
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={project.startDate ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">Target end</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={project.endDate ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={project.notes ?? ""}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" asChild disabled={pending}>
          <Link href={`/projects/${project.id}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
