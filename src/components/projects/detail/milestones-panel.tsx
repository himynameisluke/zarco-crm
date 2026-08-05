"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Flag, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { formatDateShort } from "@/lib/format";
import {
  completeProjectMilestone,
  createProjectMilestone,
  deleteProjectMilestone,
  updateProjectMilestone,
} from "@/app/(app)/projects/actions-milestones";
import type { MemberOption, ProjectMilestoneRow, ProjectPhaseRow } from "./types";
import { businessDateString } from "@/lib/dates/business";

function MilestoneForm({
  action,
  members,
  phases,
  defaultValues,
  submitLabel,
  onDone,
}: {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  members: MemberOption[];
  phases: ProjectPhaseRow[];
  defaultValues?: Partial<{
    name: string;
    description: string | null;
    dueDate: string | null;
    phaseId: string | null;
    ownerId: string | null;
  }>;
  submitLabel: string;
  onDone: () => void;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ms-name">Name</Label>
          <Input id="ms-name" name="name" required defaultValue={defaultValues?.name ?? ""} disabled={pending} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ms-description">Description</Label>
          <Textarea
            id="ms-description"
            name="description"
            rows={2}
            defaultValue={defaultValues?.description ?? ""}
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ms-dueDate">Due</Label>
            <Input
              id="ms-dueDate"
              name="dueDate"
              type="date"
              defaultValue={defaultValues?.dueDate ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ms-phaseId">Phase</Label>
            <Select name="phaseId" defaultValue={defaultValues?.phaseId ?? ""}>
              <SelectTrigger id="ms-phaseId" className="w-full" disabled={pending}>
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
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ms-ownerId">Owner</Label>
          <Select name="ownerId" defaultValue={defaultValues?.ownerId ?? ""}>
            <SelectTrigger id="ms-ownerId" className="w-full" disabled={pending}>
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
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MilestonesPanel({
  projectId,
  milestones,
  members,
  phases,
}: {
  projectId: string;
  milestones: ProjectMilestoneRow[];
  members: MemberOption[];
  phases: ProjectPhaseRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneRow | null>(null);
  const [pending, startTransition] = useTransition();
  const now = new Date();

  const phaseName = (id: string | null) => phases.find((p) => p.id === id)?.name ?? "Unphased";
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Unassigned";

  const sorted = [...milestones].sort((a, b) => {
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No milestones yet"
          description="Milestones mark the checkpoints that matter — add the first one."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((m) => {
            const overdue = !!m.dueDate && !m.completedAt && m.dueDate < businessDateString(now);
            return (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
                style={overdue ? { borderColor: "var(--danger-edge)", background: "var(--danger-wash)" } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{
                        textDecoration: m.completedAt ? "line-through" : "none",
                        color: m.completedAt ? "var(--ink-40)" : undefined,
                      }}
                    >
                      {m.name}
                    </span>
                    {overdue ? <span style={{ fontSize: 11, color: "var(--danger)" }}>Overdue</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{m.dueDate ? formatDateShort(m.dueDate) : "No due date"}</span>
                    <span>{phaseName(m.phaseId)}</span>
                    <span>{memberName(m.ownerId)}</span>
                    {m.completedAt ? <span>Completed {formatDateShort(m.completedAt)}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!m.completedAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await completeProjectMilestone(m.id, projectId);
                          if (result && "error" in result) toast.error(result.error);
                        });
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(m)}
                    aria-label="Edit milestone"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await deleteProjectMilestone(m.id, projectId);
                      });
                    }}
                    aria-label="Delete milestone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
          </DialogHeader>
          <MilestoneForm
            action={createProjectMilestone.bind(null, projectId)}
            members={members}
            phases={phases}
            submitLabel="Add milestone"
            onDone={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit milestone</DialogTitle>
          </DialogHeader>
          {editing ? (
            <MilestoneForm
              action={updateProjectMilestone.bind(null, editing.id, projectId)}
              members={members}
              phases={phases}
              defaultValues={{
                name: editing.name,
                description: editing.description,
                dueDate: editing.dueDate,
                phaseId: editing.phaseId,
                ownerId: editing.ownerId,
              }}
              submitLabel="Save changes"
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
