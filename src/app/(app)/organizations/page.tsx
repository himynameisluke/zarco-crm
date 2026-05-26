import Link from "next/link";
import { desc } from "drizzle-orm";
import { Building2, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OrganizationsPage() {
  await requireUser();

  const rows = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.updatedAt))
    .limit(200);

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Companies you work with."
        action={
          <Button asChild>
            <Link href="/organizations/new">
              <Plus className="h-4 w-4" />
              New organization
            </Link>
          </Button>
        }
      />

      <div className="p-4 lg:p-8">
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Add your first organization to start tracking companies."
            action={
              <Button asChild>
                <Link href="/organizations/new">
                  <Plus className="h-4 w-4" />
                  New organization
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/organizations/${o.id}`} className="hover:underline">
                        {o.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{o.domain ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{o.industry ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {o.employeeCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(o.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
