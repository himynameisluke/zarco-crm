"use client";

import { Sparkles } from "lucide-react";

export function SparkleTrigger() {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      title="Ask Claude (⌘K)"
      onClick={() => {
        window.dispatchEvent(new Event("zarco:command-palette:open"));
      }}
    >
      <Sparkles size={15} color="var(--magenta)" />
    </button>
  );
}
