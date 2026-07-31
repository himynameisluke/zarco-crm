import type {
  ProjectHealthLabelValue,
  ProjectRiskSeverityValue,
  TaskPriorityValue,
  TaskStatusValue,
} from "@/lib/projects/labels";
import {
  PROJECT_HEALTH_LABELS,
  PROJECT_RISK_SEVERITY_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/projects/labels";

// Small presentational chips shared across the project detail workspace.
// Mirrors the wash+edge chip pattern already used on the deals kanban
// (daysChipStyle in kanban-board.tsx) rather than inventing a new visual
// language — same tokens (--success/--warning/--danger/--info + their
// -wash/-edge pairs), just keyed by project-management enums instead of
// days-in-stage.

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  neutral: {
    color: "var(--ink-60)",
    background: "var(--paper-3)",
    border: "1px solid var(--ink-20)",
  },
  info: {
    color: "var(--info)",
    background: "var(--info-wash)",
    border: "1px solid var(--info-edge)",
  },
  success: {
    color: "var(--success)",
    background: "var(--success-wash)",
    border: "1px solid var(--success-edge)",
  },
  warning: {
    color: "var(--warning)",
    background: "var(--warning-wash)",
    border: "1px solid var(--warning-edge)",
  },
  danger: {
    color: "var(--danger)",
    background: "var(--danger-wash)",
    border: "1px solid var(--danger-edge)",
  },
};

function Chip({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        padding: "2px 7px",
        borderRadius: 999,
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...TONE_STYLE[tone],
      }}
    >
      {children}
    </span>
  );
}

const HEALTH_TONE: Record<ProjectHealthLabelValue, Tone> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
};

export function HealthChip({ health }: { health: ProjectHealthLabelValue }) {
  return <Chip tone={HEALTH_TONE[health]}>{PROJECT_HEALTH_LABELS[health]}</Chip>;
}

/** The advisory chip shown next to health when the data suggests worse than what's set. */
export function HealthAdvisoryChip({
  suggested,
  reasons,
}: {
  suggested: ProjectHealthLabelValue;
  reasons: string[];
}) {
  return (
    <Chip
      tone={HEALTH_TONE[suggested]}
      title={reasons.length ? reasons.join("\n") : undefined}
    >
      ⚠ Data suggests {PROJECT_HEALTH_LABELS[suggested].toLowerCase()}
    </Chip>
  );
}

const SEVERITY_TONE: Record<ProjectRiskSeverityValue, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export function SeverityChip({ severity }: { severity: ProjectRiskSeverityValue }) {
  return <Chip tone={SEVERITY_TONE[severity]}>{PROJECT_RISK_SEVERITY_LABELS[severity]}</Chip>;
}

const PRIORITY_TONE: Record<TaskPriorityValue, Tone> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export function PriorityChip({ priority }: { priority: TaskPriorityValue }) {
  if (priority === "normal") return null;
  return <Chip tone={PRIORITY_TONE[priority]}>{TASK_PRIORITY_LABELS[priority]}</Chip>;
}

const TASK_STATUS_TONE: Record<TaskStatusValue, Tone> = {
  todo: "neutral",
  in_progress: "info",
  blocked: "danger",
  done: "success",
  cancelled: "neutral",
};

export function TaskStatusChip({ status }: { status: TaskStatusValue }) {
  return <Chip tone={TASK_STATUS_TONE[status]}>{TASK_STATUS_LABELS[status]}</Chip>;
}

export function OverdueChip() {
  return <Chip tone="danger">Overdue</Chip>;
}
