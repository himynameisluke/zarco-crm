"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/projects/labels";
import { createProjectTask } from "@/app/(app)/projects/actions-tasks";
import type { MemberOption } from "./types";

export function TaskQuickAdd({
  projectId,
  members,
}: {
  projectId: string;
  members: MemberOption[];
}) {
  const action = createProjectTask.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2.5"
    >
      <Input
        name="title"
        placeholder="Add a task…"
        required
        disabled={pending}
        className="h-8 min-w-[180px] flex-1"
      />
      <Select name="priority" defaultValue="normal">
        <SelectTrigger size="sm" className="w-28" disabled={pending}>
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
      <Select name="assignedTo" defaultValue="">
        <SelectTrigger size="sm" className="w-36" disabled={pending}>
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
      <Input name="dueAt" type="date" disabled={pending} className="h-8 w-36" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Add
      </Button>
      {state?.error ? <p className="w-full text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
