import { and, desc, eq } from "drizzle-orm";
import { Inbox, Plus } from "lucide-react";

import { db } from "@/lib/db";
import {
  contacts,
  deals,
  inboxItems,
  organizations,
  projects,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { requireCurrentWorkspace } from "@/lib/workspace/current";
import { Topbar } from "@/components/nav/topbar";
import { EmptyState } from "@/components/empty-state";
import { InboxItemRow } from "@/components/inbox/triage-form";
import { seedSampleInboxItem } from "./actions";
import { formatMoney } from "@/lib/format";

function contactName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

export default async function InboxPage() {
  await requireUser();
  const workspace = await requireCurrentWorkspace();

  const [pending, processed, contactRows, orgRows, dealRows, projectRows] =
    await Promise.all([
      db
        .select()
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.workspaceId, workspace.id),
            eq(inboxItems.status, "pending"),
          ),
        )
        .orderBy(desc(inboxItems.receivedAt))
        .limit(100),
      db
        .select()
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.workspaceId, workspace.id),
            eq(inboxItems.status, "processed"),
          ),
        )
        .orderBy(desc(inboxItems.processedAt))
        .limit(10),
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
        .limit(200),
      db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.workspaceId, workspace.id))
        .orderBy(desc(organizations.updatedAt))
        .limit(200),
      db
        .select({
          id: deals.id,
          name: deals.name,
          stage: deals.stage,
          valuePence: deals.valuePence,
          currency: deals.currency,
        })
        .from(deals)
        .where(eq(deals.workspaceId, workspace.id))
        .orderBy(desc(deals.updatedAt))
        .limit(200),
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.workspaceId, workspace.id))
        .orderBy(desc(projects.updatedAt))
        .limit(200),
    ]);

  const contactOptions = contactRows.map((c) => ({
    id: c.id,
    label: contactName(c),
    subtitle: c.email ?? undefined,
  }));
  const organizationOptions = orgRows.map((o) => ({
    id: o.id,
    label: o.name,
  }));
  const dealOptions = dealRows.map((d) => ({
    id: d.id,
    label: d.name,
    subtitle: `${d.stage} · ${formatMoney(d.valuePence, d.currency)}`,
  }));
  const projectOptions = projectRows.map((p) => ({
    id: p.id,
    label: p.name,
  }));

  return (
    <>
      <Topbar
        crumbs={[{ icon: Inbox, label: "Inbox" }]}
        actions={
          <form action={seedSampleInboxItem}>
            <button type="submit" className="btn">
              <Plus size={13} />
              Add sample
            </button>
          </form>
        }
      />

      <main className="screen flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--hairline)",
            fontSize: 12,
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span>
            <span className="t-mono" style={{ color: "var(--ink-2)" }}>
              {pending.length}
            </span>{" "}
            pending · {processed.length} recently processed
          </span>
          <div style={{ flex: 1 }} />
          <span
            className="t-mono"
            style={{ fontSize: 10.5, color: "var(--ink-4)" }}
          >
            Outlook sync ships in a separate phase
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {pending.length === 0 && processed.length === 0 ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                icon={Inbox}
                title="Inbox is empty"
                description="Granola transcripts, Outlook emails, and Resend bounce events will land here for triage. Hit Add sample to see the triage flow with a fake transcript."
              />
            </div>
          ) : (
            <>
              {pending.length > 0 ? (
                <section>
                  <div
                    style={{
                      padding: "12px 16px 6px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span className="t-eyebrow" style={{ fontSize: 10 }}>
                      Pending
                    </span>
                    <span
                      className="t-mono"
                      style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                    >
                      {pending.length}
                    </span>
                  </div>
                  <ul
                    style={{ listStyle: "none", margin: 0, padding: 0 }}
                  >
                    {pending.map((item) => (
                      <InboxItemRow
                        key={item.id}
                        item={item}
                        contactOptions={contactOptions}
                        organizationOptions={organizationOptions}
                        dealOptions={dealOptions}
                        projectOptions={projectOptions}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {processed.length > 0 ? (
                <section style={{ marginTop: 20 }}>
                  <div
                    style={{
                      padding: "12px 16px 6px",
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span className="t-eyebrow" style={{ fontSize: 10 }}>
                      Recently processed
                    </span>
                    <span
                      className="t-mono"
                      style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                    >
                      {processed.length}
                    </span>
                  </div>
                  <ul
                    style={{ listStyle: "none", margin: 0, padding: 0 }}
                  >
                    {processed.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--hairline)",
                          opacity: 0.65,
                          display: "flex",
                          gap: 10,
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "var(--ink-2)",
                            flex: 1,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          className="t-mono"
                          style={{ fontSize: 10, color: "var(--ink-4)" }}
                        >
                          {item.type} · {item.source} · processed{" "}
                          {item.processedAt
                            ? new Date(item.processedAt).toLocaleDateString(
                                "en-GB",
                                { day: "numeric", month: "short" },
                              )
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
