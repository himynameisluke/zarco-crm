"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";

import { acceptQuote, declineQuote } from "@/app/q/[token]/actions";

export function PublicDecisionButtons({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await declineQuote(token);
              if ("error" in result && result.error) setError(result.error);
            });
          }}
          className="btn"
          style={{ flex: 1, height: 38, justifyContent: "center", fontSize: 13 }}
        >
          <X size={14} />
          Decline
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await acceptQuote(token);
              if ("error" in result && result.error) setError(result.error);
            });
          }}
          className="btn btn-primary"
          style={{ flex: 2, height: 38, justifyContent: "center", fontSize: 13 }}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check size={14} />
          )}
          Accept this quote
        </button>
      </div>
      {error ? (
        <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>
      ) : null}
    </div>
  );
}
