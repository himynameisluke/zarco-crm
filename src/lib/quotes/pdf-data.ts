import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contacts,
  deals,
  organizations,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";

import type { QuotePdfProps } from "@/components/quotes/quote-pdf";

/**
 * Loads everything the QuotePdf component needs in one round-trip.
 * Used by both the internal /quotes/[id]/pdf route and the public
 * /q/[token]/pdf route — they only differ in the WHERE clause used to find
 * the quote (id vs publicToken).
 *
 * Returns null when the quote doesn't exist OR can't satisfy the PDF (deal
 * or organization missing — which shouldn't happen now that those FKs are
 * NOT NULL, but we defensive-check anyway).
 */
export async function loadQuotePdfData(args: {
  id?: string;
  publicToken?: string;
}): Promise<QuotePdfProps | null> {
  if (!args.id && !args.publicToken) return null;

  const [row] = await db
    .select({
      // Quote columns
      quoteNumber: quotes.quoteNumber,
      status: quotes.status,
      currency: quotes.currency,
      taxRate: quotes.taxRate,
      subtotalPence: quotes.subtotalPence,
      totalPence: quotes.totalPence,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
      quoteId: quotes.id,
      // Related entity columns (left-joined where optional)
      orgName: organizations.name,
      orgWebsite: organizations.website,
      orgDomain: organizations.domain,
      dealName: deals.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
    })
    .from(quotes)
    .innerJoin(deals, eq(quotes.dealId, deals.id))
    .innerJoin(organizations, eq(quotes.organizationId, organizations.id))
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .where(
      args.id
        ? eq(quotes.id, args.id)
        : eq(quotes.publicToken, args.publicToken!),
    )
    .limit(1);

  if (!row) return null;

  const items = await db
    .select({
      description: quoteLineItems.description,
      quantity: quoteLineItems.quantity,
      unitPricePence: quoteLineItems.unitPricePence,
      totalPence: quoteLineItems.totalPence,
    })
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, row.quoteId))
    .orderBy(quoteLineItems.sortOrder);

  return {
    quote: {
      quoteNumber: row.quoteNumber,
      status: row.status,
      currency: row.currency,
      taxRate: row.taxRate,
      subtotalPence: row.subtotalPence,
      totalPence: row.totalPence,
      validUntil: row.validUntil,
      notes: row.notes,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
    },
    lineItems: items,
    organization: {
      name: row.orgName,
      website: row.orgWebsite,
      domain: row.orgDomain,
    },
    contact: row.contactFirstName || row.contactLastName || row.contactEmail
      ? {
          firstName: row.contactFirstName,
          lastName: row.contactLastName,
          email: row.contactEmail,
        }
      : null,
    deal: { name: row.dealName },
  };
}
