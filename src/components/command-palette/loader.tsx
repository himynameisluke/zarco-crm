import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { contacts, deals, organizations } from "@/lib/db/schema";
import { getCurrentWorkspace } from "@/lib/workspace/current";
import {
  CommandPalette,
  type PaletteEntity,
} from "./command-palette";
import { formatMoney } from "@/lib/format";

function contactName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

/**
 * Server component: fetches a flat list of recent contacts / orgs / deals
 * for the command palette's quick-jump section, then hands them to the
 * client palette.
 *
 * Limited to 30 items total (10 of each kind). Anything beyond that the user
 * navigates to the relevant list page.
 */
export async function CommandPaletteLoader() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return <CommandPalette entities={[]} />;
  }
  const [recentContacts, recentOrgs, recentDeals] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
      })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspace.id))
      .orderBy(desc(contacts.updatedAt))
      .limit(10),
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
      })
      .from(organizations)
      .where(eq(organizations.workspaceId, workspace.id))
      .orderBy(desc(organizations.updatedAt))
      .limit(10),
    db
      .select({
        id: deals.id,
        name: deals.name,
        valuePence: deals.valuePence,
        currency: deals.currency,
        stage: deals.stage,
      })
      .from(deals)
      .where(eq(deals.workspaceId, workspace.id))
      .orderBy(desc(deals.updatedAt))
      .limit(10),
  ]);

  const entities: PaletteEntity[] = [
    ...recentContacts.map(
      (c): PaletteEntity => ({
        id: c.id,
        kind: "contact",
        name: contactName(c),
        subtitle: c.email ?? undefined,
      }),
    ),
    ...recentOrgs.map(
      (o): PaletteEntity => ({
        id: o.id,
        kind: "organization",
        name: o.name,
        subtitle: o.domain ?? undefined,
      }),
    ),
    ...recentDeals.map(
      (d): PaletteEntity => ({
        id: d.id,
        kind: "deal",
        name: d.name,
        subtitle: `${d.stage} · ${formatMoney(d.valuePence, d.currency)}`,
      }),
    ),
  ];

  return <CommandPalette entities={entities} />;
}
