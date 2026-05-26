"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  SquareKanban,
  Trash2,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dismissInboxItem,
  processInboxItem,
} from "@/app/(app)/inbox/actions";

type SubjectType = "contact" | "organization" | "deal" | "project";

type EntityOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type State = { error?: string; success?: boolean } | null;

const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  contact: "Contact",
  organization: "Organization",
  deal: "Deal",
  project: "Project",
};

const SUBJECT_TYPE_ICONS: Record<SubjectType, typeof Users> = {
  contact: Users,
  organization: Building2,
  deal: SquareKanban,
  project: Layers,
};

const ACTIVITY_TYPES = ["note", "call", "meeting", "email"] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function InboxItemRow({
  item,
  contactOptions,
  organizationOptions,
  dealOptions,
  projectOptions,
}: {
  item: {
    id: string;
    type: string;
    source: string;
    title: string;
    body: string | null;
    receivedAt: Date;
  };
  contactOptions: EntityOption[];
  organizationOptions: EntityOption[];
  dealOptions: EntityOption[];
  projectOptions: EntityOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [subjectType, setSubjectType] = useState<SubjectType>("contact");
  const [activityType, setActivityType] = useState<ActivityType>(
    item.type === "transcript" ? "meeting" : item.type === "email" ? "email" : "note",
  );
  const [state, formAction, pending] = useActionState<State, FormData>(
    processInboxItem,
    null,
  );
  const [dismissing, startDismiss] = useTransition();

  const entityOptionsBySubject: Record<SubjectType, EntityOption[]> = {
    contact: contactOptions,
    organization: organizationOptions,
    deal: dealOptions,
    project: projectOptions,
  };
  const options = entityOptionsBySubject[subjectType];

  return (
    <li
      style={{
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "12px 16px",
          alignItems: "flex-start",
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--ink-4)",
            cursor: "pointer",
            padding: 4,
            marginTop: -2,
            flexShrink: 0,
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              {item.title}
            </span>
            <span
              className="t-mono"
              style={{ fontSize: 10.5, color: "var(--ink-4)" }}
            >
              {item.type} · {item.source}
            </span>
          </div>
          {item.body ? (
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                margin: "4px 0 0",
                lineHeight: 1.5,
                display: expanded ? "block" : "-webkit-box",
                WebkitLineClamp: expanded ? "unset" : 2,
                WebkitBoxOrient: "vertical",
                overflow: expanded ? "visible" : "hidden",
                whiteSpace: expanded ? "pre-wrap" : "normal",
              }}
            >
              {item.body}
            </p>
          ) : null}
        </div>
        <span
          className="t-mono"
          style={{
            fontSize: 10.5,
            color: "var(--ink-4)",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {new Date(item.receivedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>

      {expanded ? (
        <form
          action={formAction}
          style={{
            padding: "0 16px 14px 42px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="subjectType" value={subjectType} />
          <input type="hidden" name="activityType" value={activityType} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
              Link to
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(Object.keys(SUBJECT_TYPE_LABELS) as SubjectType[]).map((s) => {
                const Icon = SUBJECT_TYPE_ICONS[s];
                const active = subjectType === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubjectType(s)}
                    className={cn("btn btn-sm")}
                    style={{
                      background: active ? "var(--surface-4)" : "transparent",
                      borderColor: active ? "var(--hairline-2)" : "var(--hairline)",
                      color: active ? "var(--ink)" : "var(--ink-3)",
                    }}
                  >
                    <Icon size={12} />
                    {SUBJECT_TYPE_LABELS[s]}
                  </button>
                );
              })}
            </div>

            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
              Entity
            </span>
            <Select name="subjectId">
              <SelectTrigger style={{ height: 32 }}>
                <SelectValue placeholder={`Pick a ${subjectType}…`} />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No {subjectType}s yet
                  </div>
                ) : (
                  options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                      {o.subtitle ? (
                        <span style={{ color: "var(--ink-4)", marginLeft: 6 }}>
                          {o.subtitle}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
              Log as
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {ACTIVITY_TYPES.map((t) => {
                const active = activityType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className="btn btn-sm"
                    style={{
                      background: active ? "var(--surface-4)" : "transparent",
                      borderColor: active ? "var(--hairline-2)" : "var(--hairline)",
                      color: active ? "var(--ink)" : "var(--ink-3)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {state?.error ? (
            <p style={{ fontSize: 11.5, color: "var(--danger)" }}>{state.error}</p>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm"
              disabled={dismissing}
              onClick={() => {
                startDismiss(async () => {
                  await dismissInboxItem(item.id);
                });
              }}
              style={{ color: "var(--ink-3)" }}
            >
              <Trash2 size={12} />
              Dismiss
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Process
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
