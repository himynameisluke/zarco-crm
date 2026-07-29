"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

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
import { formatDateShort } from "@/lib/format";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/projects/labels";
import {
  changeProjectTaskStatus,
  deleteProjectTask,
  updateProjectTask,
} from "@/app/(app)/projects/actions-tasks";
import { PriorityChip } from "./badges";
import type { MemberOption, ProjectPhaseRow, ProjectTaskRow } from "./types";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function TaskRow({
  task,
  projectId,
  members,
  phases,
  milestones,
  selected,
  onToggleSelect,
  onDragStart,
  overdue,
}: {
  task: ProjectTaskRow;
  projectId: string;
  members: MemberOption[];
  phases: ProjectPhaseRow[];
  milestones: { id: string; name: string }[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  overdue: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const editAction = updateProjectTask.bind(null, task.id, projectId);
  const { state, pending: editPending, onSubmit } = useActionForm(editAction);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !editPending && !state?.error) {
      setEditOpen(false);
    }
    wasPending.current = editPending;
  }, [editPending, state]);

  const assignee = members.find((m) => m.id === task.assignedTo);

  function toggleDone() {
    startTransition(async () => {
      try {
        await changeProjectTaskStatus(task.id, projectId, task.status === "done" ? "todo" : "done");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update task");
      }
    });
  }

  return (
    <>
      <li
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart(task.id);
        }}
        className="flex items-start gap-2.5 rounded-md border bg-card px-2.5 py-2"
        style={{ cursor: "grab", opacity: pending ? 0.6 : 1 }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(task.id)}
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-input"
          aria-label={`Select ${task.title}`}
        />
        <button
          type="button"
          onClick={toggleDone}
          disabled={pending}
          aria-label={task.status === "done" ? "Mark as not done" : "Mark as done"}
          style={{
            width: 14,
            height: 14,
            marginTop: 3,
            border:
              task.status === "done"
                ? "1.5px solid var(--magenta)"
                : overdue
                  ? "1.5px solid var(--danger)"
                  : "1.5px solid var(--ink-40)",
            borderRadius: 3.5,
            background: task.status === "done" ? "var(--magenta)" : "transparent",
            flexShrink: 0,
            cursor: "pointer",
            padding: 0,
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="truncate text-sm"
              style={{
                textDecoration: task.status === "done" ? "line-through" : "none",
                color: task.status === "done" ? "var(--ink-40)" : undefined,
              }}
            >
              {task.title}
            </span>
            <PriorityChip priority={task.priority} />
            {overdue ? (
              <span style={{ fontSize: 11, color: "var(--danger)" }}>Overdue</span>
            ) : null}
          </div>
          {task.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.dueAt ? <span>Due {formatDateShort(task.dueAt)}</span> : null}
            {assignee ? <span>{assignee.name}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </li>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`title-${task.id}`}>Title</Label>
                <Input
                  id={`title-${task.id}`}
                  name="title"
                  defaultValue={task.title}
                  required
                  disabled={editPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`description-${task.id}`}>Description</Label>
                <Textarea
                  id={`description-${task.id}`}
                  name="description"
                  rows={2}
                  defaultValue={task.description ?? ""}
                  disabled={editPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`dueAt-${task.id}`}>Due</Label>
                  <Input
                    id={`dueAt-${task.id}`}
                    name="dueAt"
                    type="date"
                    defaultValue={toDateInputValue(task.dueAt)}
                    disabled={editPending}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`priority-${task.id}`}>Priority</Label>
                  <Select name="priority" defaultValue={task.priority}>
                    <SelectTrigger id={`priority-${task.id}`} className="w-full" disabled={editPending}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {TASK_PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`assignedTo-${task.id}`}>Assignee</Label>
                  <Select name="assignedTo" defaultValue={task.assignedTo ?? ""}>
                    <SelectTrigger id={`assignedTo-${task.id}`} className="w-full" disabled={editPending}>
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
                <div className="grid gap-1.5">
                  <Label htmlFor={`projectPhaseId-${task.id}`}>Phase</Label>
                  <Select name="projectPhaseId" defaultValue={task.projectPhaseId ?? ""}>
                    <SelectTrigger id={`projectPhaseId-${task.id}`} className="w-full" disabled={editPending}>
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
              {milestones.length > 0 ? (
                <div className="grid gap-1.5">
                  <Label htmlFor={`milestoneId-${task.id}`}>Milestone</Label>
                  <Select name="milestoneId" defaultValue={task.milestoneId ?? ""}>
                    <SelectTrigger id={`milestoneId-${task.id}`} className="w-full" disabled={editPending}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {milestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <DialogFooter className="items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={editPending}
                onClick={() => {
                  startTransition(async () => {
                    await deleteProjectTask(task.id, projectId);
                    setEditOpen(false);
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editPending}>
                  {editPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
