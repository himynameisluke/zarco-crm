"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Send } from "lucide-react";
import { toast } from "sonner";

import { markQuoteSent } from "@/app/(app)/quotes/actions";

export function CopyPublicLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy public link"}
    </button>
  );
}

export function MarkSentButton({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await markQuoteSent(quoteId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Send size={12} />
      Mark sent
    </button>
  );
}
