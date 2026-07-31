"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Pencil, Plus, Trash2, Loader2 } from "lucide-react";

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
  PROJECT_RISK_KINDS,
  PROJECT_RISK_KIND_LABELS,
  PROJECT_RISK_LIKELIHOODS,
  PROJECT_RISK_LIKELIHOOD_LABELS,
  PROJECT_RISK_SEVERITIES,
  PROJECT_RISK_SEVERITY_LABELS,
  type ProjectRiskKindValue,
} from "@/lib/projects/labels";
import {
  deleteProjectRisk,
  raiseProjectRisk,
  resolveProjectRisk,
  updateProjectRisk,
} from "@/app/(app)/projects/actions-risks";
import { SeverityChip } from "./badges";
import type { MemberOption, ProjectRiskRow } from "./types";

function RiskForm({
  action,
  members,
  defaultValues,
  submitLabel,
  onDone,
}: {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  members: MemberOption[];
  defaultValues?: Partial<{
    kind: ProjectRiskKindValue;
    title: string;
    description: string | null;
    severity: string;
    likelihood: string | null;
    ownerId: string | null;
    mitigation: string | null;
  }>;
  submitLabel: string;
  onDone: () => void;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const wasPending = useRef(false);
  const [kind, setKind] = useState<ProjectRiskKindValue>(defaultValues?.kind ?? "risk");

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="risk-kind">Kind</Label>
            <Select name="kind" value={kind} onValueChange={(v) => setKind(v as ProjectRiskKindValue)}>
              <SelectTrigger id="risk-kind" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_RISK_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {PROJECT_RISK_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="risk-severity">Severity</Label>
            <Select name="severity" defaultValue={defaultValues?.severity ?? "medium"}>
              <SelectTrigger id="risk-severity" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_RISK_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_RISK_SEVERITY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="risk-title">Title</Label>
          <Input id="risk-title" name="title" required defaultValue={defaultValues?.title ?? ""} disabled={pending} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="risk-description">Description</Label>
          <Textarea
            id="risk-description"
            name="description"
            rows={2}
            defaultValue={defaultValues?.description ?? ""}
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {kind === "risk" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="risk-likelihood">Likelihood</Label>
              <Select name="likelihood" defaultValue={defaultValues?.likelihood ?? ""}>
                <SelectTrigger id="risk-likelihood" className="w-full" disabled={pending}>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_RISK_LIKELIHOODS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {PROJECT_RISK_LIKELIHOOD_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="risk-ownerId">Owner</Label>
            <Select name="ownerId" defaultValue={defaultValues?.ownerId ?? ""}>
              <SelectTrigger id="risk-ownerId" className="w-full" disabled={pending}>
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
        <div className="grid gap-1.5">
          <Label htmlFor="risk-mitigation">Mitigation</Label>
          <Textarea
            id="risk-mitigation"
            name="mitigation"
            rows={2}
            defaultValue={defaultValues?.mitigation ?? ""}
            disabled={pending}
          />
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

function ResolveDialog({
  risk,
  onClose,
  projectId,
}: {
  risk: ProjectRiskRow;
  onClose: () => void;
  projectId: string;
}) {
  const [resolution, setResolution] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve {risk.kind === "blocker" ? "blocker" : "risk"}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          placeholder="How was this resolved?"
          disabled={pending}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await resolveProjectRisk(risk.id, projectId, resolution || undefined);
                if (result && "error" in result) toast.error(result.error);
                else onClose();
              });
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mark resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RisksPanel({
  projectId,
  risks,
  members,
}: {
  projectId: string;
  risks: ProjectRiskRow[];
  members: MemberOption[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRiskRow | null>(null);
  const [resolving, setResolving] = useState<ProjectRiskRow | null>(null);
  const [pending, startTransition] = useTransition();

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Unassigned";

  const sorted = [...risks].sort((a, b) => {
    if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Raise risk or blocker
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nothing raised"
          description="Risks and blockers logged against this project will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="p-2.5 font-medium">Item</th>
                <th className="p-2.5 font-medium">Severity</th>
                <th className="p-2.5 font-medium">Owner</th>
                <th className="p-2.5 font-medium">Status</th>
                <th className="p-2.5 font-medium">Raised</th>
                <th className="p-2.5 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2.5">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.kind === "blocker" ? "Blocker" : "Risk"}
                      {r.likelihood ? ` · likelihood ${r.likelihood}` : ""}
                    </p>
                  </td>
                  <td className="p-2.5">
                    <SeverityChip severity={r.severity} />
                  </td>
                  <td className="p-2.5 text-xs text-muted-foreground">{memberName(r.ownerId)}</td>
                  <td className="p-2.5 text-xs text-muted-foreground">
                    {r.status === "resolved" ? `Resolved ${r.resolvedAt ? formatDateShort(r.resolvedAt) : ""}` : r.status}
                  </td>
                  <td className="p-2.5 text-xs text-muted-foreground">{formatDateShort(r.createdAt)}</td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== "resolved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setResolving(r)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(r)}
                        aria-label="Edit"
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
                            await deleteProjectRisk(r.id, projectId);
                          });
                        }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise risk or blocker</DialogTitle>
          </DialogHeader>
          <RiskForm
            action={raiseProjectRisk.bind(null, projectId)}
            members={members}
            submitLabel="Raise"
            onDone={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.kind === "blocker" ? "blocker" : "risk"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <RiskForm
              action={updateProjectRisk.bind(null, editing.id, projectId)}
              members={members}
              defaultValues={{
                kind: editing.kind,
                title: editing.title,
                description: editing.description,
                severity: editing.severity,
                likelihood: editing.likelihood,
                ownerId: editing.ownerId,
                mitigation: editing.mitigation,
              }}
              submitLabel="Save changes"
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {resolving ? (
        <ResolveDialog risk={resolving} projectId={projectId} onClose={() => setResolving(null)} />
      ) : null}
    </div>
  );
}
