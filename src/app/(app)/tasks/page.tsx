import { asc, desc, eq, ne } from "drizzle-orm";
import { ListChecks } from "lucide-react";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import { formatRelative } from "@/lib/format";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  dueAt: Date | null;
  completedAt: Date | null;
  subjectType: "contact" | "organization" | "deal" | "project" | null;
  subjectId: string | null;
};

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
        <div
          style={{
            fontSize: 13,
            color: task.status === "done" ? "var(--ink-4)" : "var(--ink-2)",
            textDecoration: task.status === "done" ? "line-through" : "none",
            lineHeight: 1.4,
          }}
        >
          {task.title}
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
            <span
              className="t-mono"
              style={{ fontSize: 10, color: "var(--ink-4)" }}
            >
              {task.subjectType}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default async function TasksPage() {
  await requireUser();

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
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .orderBy(asc(tasks.dueAt), desc(tasks.createdAt))
    .limit(500)) as TaskRow[];

  const completed = (await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      subjectType: tasks.subjectType,
      subjectId: tasks.subjectId,
    })
    .from(tasks)
    .where(eq(tasks.status, "done"))
    .orderBy(desc(tasks.completedAt))
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
          {totalOpen === 0 && completed.length === 0 ? (
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
            </>
          )}
        </div>
      </main>
    </>
  );
}
