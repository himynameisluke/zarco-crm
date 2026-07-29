"use client";

import { useState, useTransition } from "react";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Flag,
  Loader2,
  Mail,
  Phone,
  StickyNote,
  FileText,
  GitBranch,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { loadMoreProjectActivities } from "@/app/(app)/projects/actions-detail-extra";
import type { ProjectActivityRow } from "./types";

const TYPE_ICON: Record<string, typeof ActivityIcon> = {
  note: StickyNote,
  call: Phone,
  meeting: Calendar,
  email: Mail,
  status_change: GitBranch,
  task_completed: CheckCircle2,
  milestone_completed: Flag,
  risk_raised: AlertTriangle,
  risk_resolved: CheckCircle2,
  quote_sent: FileText,
  quote_viewed: FileText,
  quote_accepted: FileText,
};

function ActivityItem({ event }: { event: ProjectActivityRow }) {
  const Icon = TYPE_ICON[event.type] ?? ActivityIcon;
  return (
    <li className="flex gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{event.subject ?? event.type}</p>
        {event.body ? (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{event.body}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {event.type} · {event.occurredAt.toLocaleString("en-GB")}
          {event.source === "mcp" ? " · via MCP" : event.source === "system" ? " · automated" : ""}
        </p>
      </div>
    </li>
  );
}

export function ActivityPanel({
  projectId,
  initialActivities,
  initialTotal,
}: {
  projectId: string;
  initialActivities: ProjectActivityRow[];
  initialTotal: number;
}) {
  const [events, setEvents] = useState(initialActivities);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const hasMore = events.length < initialTotal;

  function loadMore() {
    startTransition(async () => {
      const next = page + 1;
      const result = await loadMoreProjectActivities(projectId, next);
      setEvents((prev) => [...prev, ...result.rows]);
      setPage(next);
    });
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        description="Status changes, completions, and notes logged against this project will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {events.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </ol>
      {hasMore ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={loadMore}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
