import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Download, FileText, Pencil } from "lucide-react";

import { db } from "@/lib/db";
import {
  contacts,
  deals,
  organizations,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Topbar } from "@/components/nav/topbar";
import { PageHeader } from "@/components/page-header";
import { DeleteQuoteButton } from "@/components/quotes/delete-quote-button";
import {
  CopyPublicLinkButton,
  MarkSentButton,
} from "@/components/quotes/quote-actions";
import { formatDateShort, formatMoney } from "@/lib/format";
import {
  QUOTE_STATUS_CHIP,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "../schema";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const resolvedProto = proto ?? (host.startsWith("localhost") ? "http" : "https");
  return `${resolvedProto}://${host}`;
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const workspace = await requireCurrentWorkspace();
  const { id } = await params;
  const baseUrl = await getBaseUrl();

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
      publicToken: quotes.publicToken,
      sentAt: quotes.sentAt,
      viewedAt: quotes.viewedAt,
      acceptedAt: quotes.acceptedAt,
      createdAt: quotes.createdAt,
      organizationId: quotes.organizationId,
      organizationName: organizations.name,
      contactId: quotes.contactId,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
      dealId: quotes.dealId,
      dealName: deals.name,
    })
    .from(quotes)
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .leftJoin(deals, eq(quotes.dealId, deals.id))
    .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspace.id)))
    .limit(1);

  if (!quote) {
    notFound();
  }

  const items = await db
    .select()
    .from(quoteLineItems)
    .where(
      and(
        eq(quoteLineItems.quoteId, id),
        eq(quoteLineItems.workspaceId, workspace.id),
      ),
    )
    .orderBy(asc(quoteLineItems.sortOrder));

  const publicUrl = `${baseUrl}/q/${quote.publicToken}`;
  const taxRatePercent = (Number(quote.taxRate) * 100).toFixed(2).replace(/\.?0+$/, "");
  const contactDisplay = [quote.contactFirstName, quote.contactLastName]
    .filter(Boolean)
    .join(" ") || quote.contactEmail || "—";

  return (
    <>
      <Topbar
        crumbs={[
          { icon: FileText, label: "Quotes" },
          { label: quote.quoteNumber },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              {/* download attribute prompts the browser to save rather than
                  opening — same route also supports ?inline=1 for in-tab view */}
              <a href={`/quotes/${quote.id}/pdf`} download>
                <Download className="h-3.5 w-3.5" />
                PDF
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/quotes/${quote.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            <DeleteQuoteButton quoteId={quote.id} quoteNumber={quote.quoteNumber} />
          </>
        }
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <PageHeader
          title={quote.quoteNumber}
          description={
            quote.organizationName
              ? `For ${quote.organizationName}${contactDisplay !== "—" ? ` · ${contactDisplay}` : ""}`
              : undefined
          }
          action={
            <span
              className={`chip ${QUOTE_STATUS_CHIP[quote.status as QuoteStatus]}`}
            >
              {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
            </span>
          }
        />

        <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Line items</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ width: 90, textAlign: "right" }}>Qty</th>
                      <th style={{ width: 130, textAlign: "right" }}>Unit</th>
                      <th style={{ width: 130, textAlign: "right" }}>Total</th>
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
                        <td
                          className="t-num"
                          style={{ textAlign: "right" }}
                        >
                          {formatMoney(li.unitPricePence, quote.currency)}
                        </td>
                        <td
                          className="t-num"
                          style={{ textAlign: "right" }}
                        >
                          {formatMoney(li.totalPence, quote.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--hairline)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 4,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--ink-3)", textAlign: "right" }}>
                    Subtotal
                  </span>
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
                    style={{ color: "var(--ink)", fontSize: 18 }}
                  >
                    {formatMoney(quote.totalPence, quote.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {quote.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Notes for the recipient</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                      color: "var(--ink-2)",
                      margin: 0,
                    }}
                  >
                    {quote.notes}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="text-xs text-muted-foreground">Public link</p>
                <p
                  className="t-mono"
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    wordBreak: "break-all",
                  }}
                >
                  {publicUrl}
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <CopyPublicLinkButton url={publicUrl} />
                  {quote.status === "draft" ? (
                    <MarkSentButton quoteId={quote.id} />
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-foreground">
                      {quote.sentAt
                        ? formatDateShort(quote.sentAt)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Viewed</p>
                    <p className="text-foreground">
                      {quote.viewedAt
                        ? formatDateShort(quote.viewedAt)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                    <p className="text-foreground">
                      {quote.acceptedAt
                        ? formatDateShort(quote.acceptedAt)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valid until</p>
                    <p className="text-foreground">
                      {quote.validUntil
                        ? formatDateShort(quote.validUntil)
                        : "—"}
                    </p>
                  </div>
                </div>

                {quote.dealId && quote.dealName ? (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">Linked deal</p>
                    <Link
                      href={`/deals/${quote.dealId}`}
                      className="hover:underline text-sm"
                    >
                      {quote.dealName}
                    </Link>
                  </div>
                ) : null}
              </div>

              <p
                style={{
                  fontSize: 11,
                  color: "var(--ink-4)",
                  borderTop: "1px solid var(--hairline)",
                  paddingTop: 10,
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                Email send via Resend + PDF download ship in a later phase.
                For now copy the public link and paste it into Outlook.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
