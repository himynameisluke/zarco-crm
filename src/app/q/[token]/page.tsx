import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Check, X } from "lucide-react";

import { db } from "@/lib/db";
import {
  contacts,
  organizations,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";
import { ZarcoMark } from "@/components/nav/zarco-mark";
import { PublicDecisionButtons } from "@/components/quotes/public-decision";
import { formatDateShort, formatMoney } from "@/lib/format";
import { recordQuoteView } from "./actions";

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [quote] = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      status: quotes.status,
      subtotalPence: quotes.subtotalPence,
      taxRate: quotes.taxRate,
      totalPence: quotes.totalPence,
      currency: quotes.currency,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      organizationName: organizations.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(quotes)
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .where(eq(quotes.publicToken, token))
    .limit(1);

  if (!quote) {
    notFound();
  }

  if (quote.status === "draft") {
    // Draft quotes shouldn't be public yet — hide them behind the same 404.
    notFound();
  }

  const items = await db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quote.id))
    .orderBy(asc(quoteLineItems.sortOrder));

  // Fire-and-forget view recording (idempotent — only sets viewedAt once).
  await recordQuoteView(token);

  const taxRatePercent = (Number(quote.taxRate) * 100)
    .toFixed(2)
    .replace(/\.?0+$/, "");
  const recipientName =
    [quote.contactFirstName, quote.contactLastName].filter(Boolean).join(" ") ||
    null;

  const decided = quote.status === "accepted" || quote.status === "declined";

  return (
    <div
      className="crm screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "48px 24px",
        background: "var(--bg)",
      }}
    >
      {/* Ambient bloom */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -160,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.78 0.20 145 / 0.18), transparent 65%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          left: -180,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.82 0.08 220 / 0.15), transparent 65%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 720,
          position: "relative",
          zIndex: 3,
        }}
      >
        {/* Brand header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <ZarcoMark size={28} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.02em",
              }}
            >
              Zarco
            </span>
            <span
              className="t-mono"
              style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.14em" }}
            >
              ZRC · UK
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <span
            className="t-mono"
            style={{ fontSize: 11, color: "var(--ink-3)" }}
          >
            QUOTE {quote.quoteNumber}
          </span>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1
            className="t-display"
            style={{
              fontSize: 28,
              margin: "0 0 6px",
              color: "var(--ink)",
            }}
          >
            {recipientName ? `For ${recipientName}` : "Your quote"}
          </h1>
          {quote.organizationName ? (
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-3)",
                margin: "0 0 24px",
              }}
            >
              {quote.organizationName}
            </p>
          ) : null}

          <table className="tbl" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: 70, textAlign: "right" }}>Qty</th>
                <th style={{ width: 110, textAlign: "right" }}>Unit</th>
                <th style={{ width: 110, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li) => (
                <tr key={li.id}>
                  <td>{li.description}</td>
                  <td
                    className="t-mono"
                    style={{ textAlign: "right", fontSize: 12 }}
                  >
                    {li.quantity}
                  </td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {formatMoney(li.unitPricePence, quote.currency)}
                  </td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {formatMoney(li.totalPence, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              paddingTop: 12,
              borderTop: "1px solid var(--hairline)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 6,
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            <span style={{ color: "var(--ink-3)", textAlign: "right" }}>Subtotal</span>
            <span className="t-num" style={{ color: "var(--ink-2)" }}>
              {formatMoney(quote.subtotalPence, quote.currency)}
            </span>
            <span style={{ color: "var(--ink-3)", textAlign: "right" }}>
              VAT ({taxRatePercent}%)
            </span>
            <span className="t-num" style={{ color: "var(--ink-2)" }}>
              {formatMoney(
                quote.totalPence - quote.subtotalPence,
                quote.currency,
              )}
            </span>
            <span
              style={{
                color: "var(--ink)",
                fontWeight: 500,
                fontSize: 14,
                textAlign: "right",
              }}
            >
              Total
            </span>
            <span
              className="t-num"
              style={{ color: "var(--ink)", fontSize: 22 }}
            >
              {formatMoney(quote.totalPence, quote.currency)}
            </span>
          </div>

          {quote.notes ? (
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                borderRadius: 8,
                marginBottom: 24,
                fontSize: 13,
                color: "var(--ink-2)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
              }}
            >
              {quote.notes}
            </div>
          ) : null}

          {quote.validUntil ? (
            <p
              className="t-mono"
              style={{
                fontSize: 11,
                color: "var(--ink-4)",
                margin: "0 0 18px",
                letterSpacing: "0.05em",
              }}
            >
              VALID UNTIL {formatDateShort(quote.validUntil).toUpperCase()}
            </p>
          ) : null}

          {decided ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                borderRadius: 8,
                background:
                  quote.status === "accepted"
                    ? "oklch(0.78 0.18 145 / 0.10)"
                    : "oklch(0.70 0.20 25 / 0.10)",
                border: `1px solid ${
                  quote.status === "accepted"
                    ? "oklch(0.78 0.18 145 / 0.30)"
                    : "oklch(0.70 0.20 25 / 0.30)"
                }`,
                color:
                  quote.status === "accepted"
                    ? "oklch(0.85 0.18 145)"
                    : "oklch(0.80 0.20 25)",
              }}
            >
              {quote.status === "accepted" ? (
                <Check size={16} />
              ) : (
                <X size={16} />
              )}
              <span style={{ fontSize: 13 }}>
                {quote.status === "accepted"
                  ? `Accepted${quote.acceptedAt ? ` on ${formatDateShort(quote.acceptedAt)}` : ""}. We'll be in touch.`
                  : "This quote was declined."}
              </span>
            </div>
          ) : (
            <PublicDecisionButtons token={token} />
          )}
        </div>

        <p
          className="t-mono"
          style={{
            fontSize: 10,
            color: "var(--ink-4)",
            textAlign: "center",
            marginTop: 24,
            letterSpacing: "0.14em",
          }}
        >
          © 2026 ZARCO LTD · LONDON, UK
        </p>
      </div>
    </div>
  );
}
