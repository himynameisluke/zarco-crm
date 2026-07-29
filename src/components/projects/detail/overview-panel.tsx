import Link from "next/link";
import { Activity as ActivityIcon, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { formatDateShort, formatMoney } from "@/lib/format";
import { SeverityChip } from "./badges";
import type { ProjectDetailData } from "./types";

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function OverviewPanel({ detail }: { detail: ProjectDetailData }) {
  const { project, deal, quotes, contract, milestones, risks, recentActivities } = detail;

  const nextMilestone = milestones
    .filter((m) => !m.completedAt)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })[0];

  const openBlockers = risks.filter((r) => r.kind === "blocker" && r.status !== "resolved");
  const latestActivity = recentActivities[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {project.description ? (
              <p className="whitespace-pre-wrap text-sm">{project.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success criteria</CardTitle>
          </CardHeader>
          <CardContent>
            {project.successCriteria ? (
              <p className="whitespace-pre-wrap text-sm">{project.successCriteria}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not defined yet — what does &ldquo;done&rdquo; look like?
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest activity</CardTitle>
          </CardHeader>
          <CardContent>
            {latestActivity ? (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">
                  {latestActivity.subject ?? latestActivity.type}
                </p>
                {latestActivity.body ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                    {latestActivity.body}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {latestActivity.type} · {latestActivity.occurredAt.toLocaleString("en-GB")}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={ActivityIcon}
                title="No activity yet"
                description="Notes, status changes, and completions will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Commercial context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deal ? (
              <DetailBlock label="Linked deal">
                <Link href={`/deals/${deal.id}`} className="hover:underline">
                  {deal.name}
                </Link>{" "}
                <Badge variant="secondary" className="text-xs">
                  {deal.stage}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(deal.valuePence, deal.currency)}
                  {deal.closeDate ? ` · ${formatDateShort(deal.closeDate)}` : ""}
                </p>
              </DetailBlock>
            ) : (
              <p className="text-sm text-muted-foreground">No linked deal.</p>
            )}

            {quotes.length > 0 ? (
              <>
                <Separator />
                <DetailBlock label={`Quotes (${quotes.length})`}>
                  <ul className="space-y-1.5">
                    {quotes.slice(0, 5).map((q) => (
                      <li key={q.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {q.quoteNumber}
                        </span>
                        <span className="text-muted-foreground">
                          {formatMoney(q.totalPence, q.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </DetailBlock>
              </>
            ) : null}

            {contract ? (
              <>
                <Separator />
                <DetailBlock label="Contract">
                  <Link href="/renewals" className="hover:underline">
                    {contract.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Renews {formatDateShort(contract.endDate)}
                  </p>
                </DetailBlock>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next milestone</CardTitle>
          </CardHeader>
          <CardContent>
            {nextMilestone ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{nextMilestone.name}</p>
                <p className="text-xs text-muted-foreground">
                  {nextMilestone.dueDate ? formatDateShort(nextMilestone.dueDate) : "No due date"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No open milestones.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open blockers ({openBlockers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {openBlockers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing blocking this project.</p>
            ) : (
              <ul className="space-y-2">
                {openBlockers.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{b.title}</span>
                    <SeverityChip severity={b.severity} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
