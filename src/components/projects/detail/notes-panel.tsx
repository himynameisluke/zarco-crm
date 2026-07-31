import { StickyNote } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ActivityComposer } from "@/components/activity/activity-composer";
import type { ProjectActivityRow } from "./types";

export function NotesPanel({
  projectId,
  recentActivities,
}: {
  projectId: string;
  recentActivities: ProjectActivityRow[];
}) {
  const notes = recentActivities.filter((a) => a.type === "note");

  return (
    <div className="space-y-4">
      <ActivityComposer subjectType="project" subjectId={projectId} />

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Notes logged above appear here — the full timeline (incl. status changes and completions) is on the Activity tab."
        />
      ) : (
        <ol className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{n.subject ?? "Note"}</p>
              {n.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {n.occurredAt.toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
