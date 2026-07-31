"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";

import { colorFromString } from "@/lib/colors";
import { formatDateShort, getInitials } from "@/lib/format";
import type { BoardCard as BoardCardData } from "@/lib/projects/queries";
import { ProgressBar } from "./progress-bar";

const HEALTH_DOT_CLASS: Record<string, string> = {
  on_track: "dot --ok",
  at_risk: "dot --warn",
  off_track: "dot --danger",
};

/**
 * Draggable project card. Only the name is a `<Link>` — the card body
 * itself carries `draggable` so a click-through to the detail page and a
 * drag-to-move gesture don't fight over the same element (deals kanban
 * precedent uses a whole-card Link; there's no drag there to conflict
 * with, so this diverges on purpose).
 */
export function BoardCard({
  card,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  card: BoardCardData;
  dragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const ownerColor = colorFromString(card.ownerName ?? card.id);
  const initials = card.ownerName ? getInitials(...card.ownerName.split(" ")) : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--hairline)",
        borderRadius: 8,
        padding: "10px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        cursor: "grab",
        opacity: dragging ? 0.4 : 1,
        transition: "opacity 120ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span className={HEALTH_DOT_CLASS[card.health] ?? "dot"} style={{ marginTop: 6 }} />
        <Link
          href={`/projects/${card.id}`}
          style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, lineHeight: 1.3, textDecoration: "none" }}
        >
          {card.name}
        </Link>
      </div>

      {card.organizationName ? (
        <div className="truncate" style={{ fontSize: 11.5, color: "var(--ink-60)", paddingLeft: 14 }}>
          {card.organizationName}
        </div>
      ) : null}

      <div style={{ paddingLeft: 14 }}>
        <ProgressBar value={card.progress} width={64} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 6,
          paddingLeft: 14,
          borderTop: "1px solid var(--hairline)",
        }}
      >
        {initials ? (
          <span
            className="zk-avatar"
            style={{
              width: 18,
              height: 18,
              fontSize: 9,
              background: `${ownerColor}22`,
              borderColor: `${ownerColor}55`,
              color: ownerColor,
            }}
            title={card.ownerName ?? undefined}
          >
            {initials}
          </span>
        ) : null}
        <span style={{ fontSize: 11, color: "var(--ink-60)", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Calendar size={10} color="var(--ink-40)" />
          {card.endDate ? formatDateShort(card.endDate) : "—"}
        </span>
      </div>
    </div>
  );
}
