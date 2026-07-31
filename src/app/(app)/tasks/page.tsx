import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ListChecks } from "lucide-react";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import { formatRelative } from "@/lib/format";
import {
  OPEN_TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  type TaskPriorityValue,
  type TaskStatusValue,
} from "@/lib/projects/labels";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  dueAt: Date | null;
  completedAt: Date | null;
  subjectType: "contact" | "organization" | "deal" | "project" | null;
  subjectId: string | null;
};

// Quiet tone per priority — reuses the same wash/edge tokens as the
// settings status pills. Only urgent leans toward the danger register;
// low/normal stay near-invisible so the list isn't a wall of color.
const PRIORITY_STYLES: Record<TaskPriorityValue, { bg: string; border: string; color: string }> = {
  low: { bg: "var(--paper-3)", border: "var(--ink-20)", color: "var(--ink-4)" },
  normal: { bg: "var(--paper-3)", border: "var(--ink-20)", color: "var(--ink-60)" },
  high: { bg: "var(--warning-wash)", border: "var(--warning-edge)", color: "var(--warning)" },
  urgent: { bg: "var(--danger-wash)", border: "var(--danger-edge)", color: "var(--danger)" },
};

function PriorityChip({ priority }: { priority: TaskPriorityValue }) {
  if (priority === "normal") return null; // the common case stays unlabeled
  const tone = PRIORITY_STYLES[priority];
  return (
    <span
      className="t-mono"
      style={{
        fontSize: 9.5,
        padding: "1px 6px",
        borderRadius: 999,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

function Section({
  label,
  count,
  color,
  children,
}: {
  label: string;
  count: number;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "0 16px",
          marginBottom: 6,
        }}
      >
        <span
          className="t-eyebrow"
          style={{ fontSize: 10, color: color ?? "var(--ink-3)" }}
        >
          {label}
        </span>
        <span
          className="t-mono"
          style={{ fontSize: 10.5, color: "var(--ink-4)" }}
        >
          {count}
        </span>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </ul>
    </div>
  );
}

function TaskItem({
  task,
  overdue = false,
}: {
  task: TaskRow;
  overdue?: boolean;
}) {
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "10px 16px",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <TaskCheckbox taskId={task.id} status={task.status} overdue={overdue} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              color:
                task.status === "done" || task.status === "cancelled"
                  ? "var(--ink-4)"
                  : "var(--ink-2)",
              textDecoration:
                task.status === "done" || task.status === "cancelled"
                  ? "line-through"
                  : "none",
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </span>
          {task.status === "blocked" ? (
            <span
              className="t-mono"
              style={{
                fontSize: 9.5,
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--warning-wash)",
                border: "1px solid var(--warning-edge)",
                color: "var(--warning)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              Blocked
            </span>
          ) : null}
        </div>
        {task.description ? (
          <p
            style={{
              fontSize: 11.5,
              color: "var(--ink-3)",
              margin: "2px 0 0",
              lineHeight: 1.4,
            }}
          >
            {task.description}
          </p>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <PriorityChip priority={task.priority} />
          {task.dueAt ? (
            <span
              className="t-mono"
              style={{
                fontSize: 10,
                color: overdue ? "oklch(0.80 0.20 25)" : "var(--ink-4)",
              }}
            >
              {overdue ? "overdue " : "due "}
              {formatRelative(task.dueAt)}
            </span>
          ) : null}
          {task.subjectType && task.subjectId ? (
            <Link
              href={`/${task.subjectType === "organization" ? "organizations" : `${task.subjectType}s`}/${task.subjectId}`}
              className="t-mono hover:underline"
              style={{ fontSize: 10, color: "var(--ink-4)" }}
            >
              {task.subjectType} ↗
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default async function TasksPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const now = new Date();
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const sevenDaysAhead = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
  );

  // Fetch all open tasks once, then partition in JS — simpler than 4 queries.
  const openTasks = (await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspace.id),
        inArray(tasks.status, OPEN_TASK_STATUSES),
      ),
    )
    .orderBy(asc(tasks.dueAt), desc(tasks.createdAt))
    .limit(500)) as TaskRow[];

  const completed = (await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(
      and(eq(tasks.workspaceId, workspace.id), eq(tasks.status, "done")),
    )
    .orderBy(desc(tasks.completedAt))
    .limit(20)) as TaskRow[];

  // Cancelled tasks have no completedAt (that column is only stamped by the
  // done path) — order by updatedAt instead, same "recent activity" intent
  // as the completed section above.
  const cancelled = (await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(
      and(eq(tasks.workspaceId, workspace.id), eq(tasks.status, "cancelled")),
    )
    .orderBy(desc(tasks.updatedAt))
    .limit(20)) as TaskRow[];

  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const thisWeek: TaskRow[] = [];
  const later: TaskRow[] = [];

  for (const t of openTasks) {
    if (!t.dueAt) {
      later.push(t);
      continue;
    }
    if (t.dueAt < now) {
      overdue.push(t);
    } else if (t.dueAt < startOfTomorrow) {
      today.push(t);
    } else if (t.dueAt < sevenDaysAhead) {
      thisWeek.push(t);
    } else {
      later.push(t);
    }
  }

  const totalOpen = openTasks.length;

  return (
    <>
      <Topbar crumbs={[{ icon: ListChecks, label: "Tasks" }]} />
      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <TaskQuickAdd />

        <div style={{ flex: 1, overflowY: "auto", paddingTop: 16 }}>
          {totalOpen === 0 && completed.length === 0 && cancelled.length === 0 ? (
            <div style={{ padding: 32 }}>
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "var(--ink-3)",
                  fontSize: 13,
                }}
              >
                Nothing to do. Add a task above.
              </div>
            </div>
          ) : (
            <>
              {overdue.length > 0 ? (
                <Section
                  label="Overdue"
                  count={overdue.length}
                  color="oklch(0.80 0.20 25)"
                >
                  {overdue.map((t) => (
                    <TaskItem key={t.id} task={t} overdue />
                  ))}
                </Section>
              ) : null}

              <Section label="Due today" count={today.length}>
                {today.length === 0 ? (
                  <li
                    style={{
                      padding: "10px 16px",
                      color: "var(--ink-4)",
                      fontSize: 12.5,
                    }}
                  >
                    No tasks due today.
                  </li>
                ) : (
                  today.map((t) => <TaskItem key={t.id} task={t} />)
                )}
              </Section>

              {thisWeek.length > 0 ? (
                <Section label="This week" count={thisWeek.length}>
                  {thisWeek.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </Section>
              ) : null}

              {later.length > 0 ? (
                <Section label="Later" count={later.length}>
                  {later.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </Section>
              ) : null}

              {completed.length > 0 ? (
                <Section label="Recently done" count={completed.length}>
                  {completed.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </Section>
              ) : null}

              {cancelled.length > 0 ? (
                <Section label="Cancelled" count={cancelled.length} color="var(--ink-4)">
                  {cancelled.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </Section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
