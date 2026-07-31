"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import {
  TASK_STATUS_LABELS,
  type TaskStatusValue,
} from "@/lib/projects/labels";
import { bulkUpdateProjectTasks, changeProjectTaskStatus } from "@/app/(app)/projects/actions-tasks";
import { TaskQuickAdd } from "./task-quick-add";
import { TaskRow } from "./task-row";
import type { MemberOption, ProjectMilestoneRow, ProjectPhaseRow, ProjectTaskRow } from "./types";

const OPEN_GROUPS: { status: TaskStatusValue; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

export function TasksPanel({
  projectId,
  tasks,
  members,
  phases,
  milestones,
}: {
  projectId: string;
  tasks: ProjectTaskRow[];
  members: MemberOption[];
  phases: ProjectPhaseRow[];
  milestones: ProjectMilestoneRow[];
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterMilestone, setFilterMilestone] = useState("");
  const [, startTransition] = useTransition();

  const milestoneOptions = useMemo(
    () => milestones.map((m) => ({ id: m.id, name: m.name })),
    [milestones],
  );

  const filtered = localTasks.filter((t) => {
    if (filterAssignee && t.assignedTo !== filterAssignee) return false;
    if (filterPhase && t.projectPhaseId !== filterPhase) return false;
    if (filterMilestone && t.milestoneId !== filterMilestone) return false;
    return true;
  });

  const now = new Date();
  const groups = OPEN_GROUPS.map((g) => ({
    ...g,
    tasks: filtered.filter((t) => t.status === g.status),
  }));
  const cancelled = filtered.filter((t) => t.status === "cancelled");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDrop(targetStatus: TaskStatusValue) {
    if (!draggingId) return;
    const id = draggingId;
    setDraggingId(null);
    const previous = localTasks;
    const task = previous.find((t) => t.id === id);
    if (!task || task.status === targetStatus) return;

    // Optimistic move with rollback — the one place the spec explicitly
    // calls for it (drag between status groups).
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: targetStatus, completedAt: targetStatus === "done" ? new Date() : null }
          : t,
      ),
    );

    startTransition(async () => {
      try {
        await changeProjectTaskStatus(id, projectId, targetStatus);
      } catch (err) {
        setLocalTasks(previous);
        toast.error(err instanceof Error ? err.message : "Couldn't move task");
      }
    });
  }

  function applyBulk(patch: { status?: TaskStatusValue; assignedTo?: string | null }) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const previous = localTasks;
    setLocalTasks((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)),
    );
    startTransition(async () => {
      const result = await bulkUpdateProjectTasks(projectId, ids, patch);
      if (result && "error" in result) {
        setLocalTasks(previous);
        toast.error(result.error);
      } else {
        setSelected(new Set());
      }
    });
  }

  const hasAnyTasks = tasks.length > 0;

  return (
    <div className="space-y-4">
      <TaskQuickAdd projectId={projectId} members={members} />

      {(phases.length > 0 || members.length > 0 || milestoneOptions.length > 0) && hasAnyTasks ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterAssignee || "__all"} onValueChange={(v) => setFilterAssignee(v === "__all" ? "" : String(v))}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All assignees</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {phases.length > 0 ? (
            <Select value={filterPhase || "__all"} onValueChange={(v) => setFilterPhase(v === "__all" ? "" : String(v))}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="All phases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All phases</SelectItem>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {milestoneOptions.length > 0 ? (
            <Select
              value={filterMilestone || "__all"}
              onValueChange={(v) => setFilterMilestone(v === "__all" ? "" : String(v))}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="All milestones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All milestones</SelectItem>
                {milestoneOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent px-3 py-2">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <Select
            onValueChange={(v) => {
              if (typeof v === "string") applyBulk({ status: v as TaskStatusValue });
            }}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Set status…" />
            </SelectTrigger>
            <SelectContent>
              {(["todo", "in_progress", "blocked", "done", "cancelled"] as TaskStatusValue[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) => {
              if (typeof v === "string") applyBulk({ assignedTo: v });
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Assign to…" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      {!hasAnyTasks ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the first task above to start tracking work."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div
              key={group.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(group.status)}
              className="space-y-2 rounded-lg"
            >
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
                <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
              </div>
              {group.tasks.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  Drop a task here to mark it {group.label.toLowerCase()}.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectId={projectId}
                      members={members}
                      phases={phases}
                      milestones={milestoneOptions}
                      selected={selected.has(task.id)}
                      onToggleSelect={toggleSelect}
                      onDragStart={setDraggingId}
                      overdue={
                        task.status !== "done" &&
                        task.status !== "cancelled" &&
                        !!task.dueAt &&
                        task.dueAt < now
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}

          {cancelled.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setCancelledOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {cancelledOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Cancelled ({cancelled.length})
              </button>
              {cancelledOpen ? (
                <ul className="mt-2 space-y-1.5">
                  {cancelled.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectId={projectId}
                      members={members}
                      phases={phases}
                      milestones={milestoneOptions}
                      selected={selected.has(task.id)}
                      onToggleSelect={toggleSelect}
                      onDragStart={setDraggingId}
                      overdue={false}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
