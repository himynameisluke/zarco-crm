"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Link2, Plus, Trash2, Loader2 } from "lucide-react";

import { useActionForm } from "@/lib/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { addProjectLink, removeProjectLink } from "@/app/(app)/projects/actions-links";
import type { ProjectLinkRow } from "./types";

const LINK_KINDS = ["doc", "repo", "deployment", "drive", "meeting", "other"] as const;
const LINK_KIND_LABELS: Record<(typeof LINK_KINDS)[number], string> = {
  doc: "Document",
  repo: "Repository",
  deployment: "Deployment",
  drive: "Drive",
  meeting: "Meeting",
  other: "Other",
};

export function LinksPanel({
  projectId,
  links,
}: {
  projectId: string;
  links: ProjectLinkRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const action = addProjectLink.bind(null, projectId);
  const { state, pending: addPending, onSubmit } = useActionForm(action);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !addPending && !state?.error) setAddOpen(false);
    wasPending.current = addPending;
  }, [addPending, state]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No links yet"
          description="Docs, repos, deployments, and drive folders relevant to this project."
        />
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{link.title}</span>
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {link.kind ? `${LINK_KIND_LABELS[link.kind as (typeof LINK_KINDS)[number]] ?? link.kind} · ` : ""}
                  added {formatDateShort(link.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await removeProjectLink(link.id, projectId);
                  });
                }}
                aria-label="Remove link"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add link</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="link-title">Title</Label>
                <Input id="link-title" name="title" required disabled={addPending} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  name="url"
                  type="url"
                  placeholder="https://…"
                  required
                  disabled={addPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="link-kind">Kind</Label>
                <Select name="kind" defaultValue="">
                  <SelectTrigger id="link-kind" className="w-full" disabled={addPending}>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {LINK_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={addPending}>
                {addPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
