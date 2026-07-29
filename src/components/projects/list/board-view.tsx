"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, SquareKanban } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import type { BoardCard as BoardCardData } from "@/lib/projects/queries";
import type { BoardColumn } from "@/lib/projects/board";
import { moveProjectOnBoard } from "@/app/(app)/projects/actions-board";
import { BoardCard } from "./board-card";

type ColumnMap = Record<string, BoardCardData[]>;

function totalCount(columns: ColumnMap): number {
  return Object.values(columns).reduce((sum, cards) => sum + cards.length, 0);
}

/**
 * Monday-style board. Cards move between columns via native HTML5
 * drag-drop: local state moves the card immediately (optimistic), the
 * server action persists it, and a failed move rolls the card back to its
 * origin column with a sonner toast — same shape as the rest of the app's
 * mutation error handling (see DeleteDealButton).
 */
export function BoardView({
  columns,
  initialProjectsByColumn,
}: {
  columns: BoardColumn[];
  initialProjectsByColumn: ColumnMap;
}) {
  const [projectsByColumn, setProjectsByColumn] = useState<ColumnMap>(initialProjectsByColumn);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (totalCount(initialProjectsByColumn) === 0) {
    return (
      <div style={{ padding: 32 }}>
        <EmptyState
          icon={SquareKanban}
          title="No projects yet"
          description="Create a project to see it move across the board."
          action={
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={13} />
              New project
            </Link>
          }
        />
      </div>
    );
  }

  function findColumnOf(cardId: string): string | null {
    for (const [key, cards] of Object.entries(projectsByColumn)) {
      if (cards.some((c) => c.id === cardId)) return key;
    }
    return null;
  }

  function handleDrop(targetColumn: string) {
    setDragOverColumn(null);
    const cardId = draggingId;
    setDraggingId(null);
    if (!cardId) return;

    const sourceColumn = findColumnOf(cardId);
    if (!sourceColumn || sourceColumn === targetColumn) return;

    const previous = projectsByColumn;
    const movingCard = previous[sourceColumn]?.find((c) => c.id === cardId);
    if (!movingCard) return;

    // Optimistic move.
    setProjectsByColumn({
      ...previous,
      [sourceColumn]: previous[sourceColumn].filter((c) => c.id !== cardId),
      [targetColumn]: [...(previous[targetColumn] ?? []), movingCard],
    });

    startTransition(async () => {
      const result = await moveProjectOnBoard(cardId, targetColumn);
      if (result && "error" in result && result.error) {
        setProjectsByColumn(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "16px 16px 24px" }}>
      <div style={{ display: "flex", gap: 14, height: "100%" }}>
        {columns.map((col) => {
          const cards = projectsByColumn[col.key] ?? [];
          const isDragTarget = dragOverColumn === col.key;
          return (
            <div key={col.key} style={{ width: 268, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px 8px",
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>{col.label}</span>
                <span className="t-mono" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>
                  {cards.length}
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                }}
                onDragLeave={() => {
                  setDragOverColumn((current) => (current === col.key ? null : current));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col.key);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  overflowY: "auto",
                  paddingRight: 2,
                  flex: 1,
                  minHeight: 60,
                  borderRadius: 8,
                  background: isDragTarget ? "var(--paper-3)" : "transparent",
                  transition: "background 100ms ease",
                }}
              >
                {cards.map((card) => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    dragging={draggingId === card.id}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(card.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverColumn(null);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
