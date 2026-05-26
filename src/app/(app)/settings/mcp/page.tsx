import { desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { Plug, Sparkles, Zap } from "lucide-react";

import { db } from "@/lib/db";
import { activities, oauthAccessTokens, oauthClients } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Topbar } from "@/components/nav/topbar";
import { CopyButton } from "@/components/settings/copy-button";
import { RevokeClientButton } from "@/components/settings/revoke-client-button";
import { EmptyState } from "@/components/empty-state";
import { formatDateShort, formatRelative } from "@/lib/format";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const resolvedProto =
    proto ?? (host.startsWith("localhost") ? "http" : "https");
  return `${resolvedProto}://${host}`;
}

export default async function MCPSettingsPage() {
  await requireUser();
  const baseUrl = await getBaseUrl();
  const mcpUrl = `${baseUrl}/mcp`;

  // Token counts per client (live + revoked + expired)
  const clientRows = await db
    .select({
      id: oauthClients.id,
      clientName: oauthClients.clientName,
      redirectUris: oauthClients.redirectUris,
      registeredAt: oauthClients.registeredAt,
      tokenCount: sql<number>`count(${oauthAccessTokens.tokenHash})::int`,
    })
    .from(oauthClients)
    .leftJoin(
      oauthAccessTokens,
      eq(oauthAccessTokens.clientId, oauthClients.id),
    )
    .groupBy(oauthClients.id)
    .orderBy(desc(oauthClients.registeredAt))
    .limit(100);

  // Recent MCP-originated activity (the audit trail)
  const recentMcpWrites = await db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      subjectType: activities.subjectType,
      subjectId: activities.subjectId,
      body: activities.body,
      occurredAt: activities.occurredAt,
    })
    .from(activities)
    .where(eq(activities.source, "mcp"))
    .orderBy(desc(activities.occurredAt))
    .limit(20);

  const desktopConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        "zarco-crm": { url: mcpUrl },
      },
    },
    null,
    2,
  );

  return (
    <>
      <Topbar
        crumbs={[
          { icon: Plug, label: "API & MCP" },
        ]}
      />

      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Endpoint */}
          <section>
            <h2
              className="t-display"
              style={{ fontSize: 18, margin: "0 0 4px", color: "var(--ink)" }}
            >
              MCP endpoint
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 12px" }}>
              The URL Claude clients connect to. Authentication is OAuth 2.1 —
              clients auto-discover the authorization server.
            </p>
            <div
              className="card"
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className="t-mono"
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  wordBreak: "break-all",
                }}
              >
                {mcpUrl}
              </span>
              <CopyButton text={mcpUrl} />
            </div>
          </section>

          {/* Connect from Claude Desktop */}
          <section>
            <h2
              className="t-display"
              style={{ fontSize: 18, margin: "0 0 4px", color: "var(--ink)" }}
            >
              Connect from Claude Desktop
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 12px" }}>
              Paste this into{" "}
              <code
                className="t-mono"
                style={{
                  fontSize: 12,
                  background: "var(--surface-3)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code>{" "}
              and restart Claude Desktop. First use triggers OAuth in a browser
              tab.
            </p>
            <div
              className="card"
              style={{
                padding: 12,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <pre
                className="t-mono"
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: 12,
                  color: "var(--ink-2)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {desktopConfigSnippet}
              </pre>
              <CopyButton text={desktopConfigSnippet} />
            </div>
          </section>

          {/* Registered clients */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <h2
                className="t-display"
                style={{ fontSize: 18, margin: 0, color: "var(--ink)" }}
              >
                Registered clients
              </h2>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {clientRows.length}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 12px" }}>
              Clients that have completed dynamic client registration against
              the MCP endpoint. Revoking a client deletes its access tokens.
            </p>
            <div className="card" style={{ overflow: "hidden" }}>
              {clientRows.length === 0 ? (
                <div style={{ padding: 32 }}>
                  <EmptyState
                    icon={Plug}
                    title="No clients yet"
                    description="Once Claude.ai web, Desktop, or a custom agent registers, it'll appear here."
                  />
                </div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Name</th>
                      <th>Redirect URIs</th>
                      <th style={{ width: 90, textAlign: "right" }}>Tokens</th>
                      <th style={{ width: 130, textAlign: "right" }}>Registered</th>
                      <th style={{ width: 110, textAlign: "right" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span style={{ color: "var(--ink)", fontWeight: 450 }}>
                            {c.clientName}
                          </span>
                          <br />
                          <span
                            className="t-mono"
                            style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                          >
                            {c.id}
                          </span>
                        </td>
                        <td>
                          <ul
                            style={{
                              listStyle: "none",
                              margin: 0,
                              padding: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {c.redirectUris.map((uri, i) => (
                              <li
                                key={i}
                                className="t-mono"
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--ink-3)",
                                  wordBreak: "break-all",
                                }}
                              >
                                {uri}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td
                          className="t-mono"
                          style={{
                            textAlign: "right",
                            fontSize: 12,
                            color: "var(--ink-3)",
                          }}
                        >
                          {c.tokenCount}
                        </td>
                        <td
                          className="t-mono"
                          style={{
                            textAlign: "right",
                            fontSize: 11.5,
                            color: "var(--ink-3)",
                          }}
                        >
                          {formatDateShort(c.registeredAt)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <RevokeClientButton
                            clientId={c.id}
                            clientName={c.clientName}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Recent MCP activity (audit trail) */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <h2
                className="t-display"
                style={{
                  fontSize: 18,
                  margin: 0,
                  color: "var(--ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={14} color="var(--amber)" />
                Recent MCP activity
              </h2>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {recentMcpWrites.length}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 12px" }}>
              Every write Claude makes via MCP appears here. Same data shows on
              each affected entity&apos;s timeline.
            </p>
            <div className="card" style={{ overflow: "hidden" }}>
              {recentMcpWrites.length === 0 ? (
                <div style={{ padding: 32 }}>
                  <EmptyState
                    icon={Sparkles}
                    title="No MCP activity yet"
                    description="Once you connect a Claude client and it starts writing to the CRM, the audit trail will appear here."
                  />
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {recentMcpWrites.map((a) => (
                    <li
                      key={a.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--hairline)",
                        display: "flex",
                        gap: 12,
                      }}
                    >
                      <Zap
                        size={13}
                        color="var(--amber)"
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--ink-2)",
                          }}
                        >
                          <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                            {a.subject ?? a.type}
                          </span>{" "}
                          <span
                            className="t-mono"
                            style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                          >
                            · {a.type} on {a.subjectType}
                          </span>
                        </div>
                        {a.body ? (
                          <p
                            style={{
                              fontSize: 11.5,
                              color: "var(--ink-3)",
                              margin: "2px 0 0",
                            }}
                          >
                            {a.body}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 10.5,
                          color: "var(--ink-4)",
                          flexShrink: 0,
                        }}
                      >
                        {formatRelative(a.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
