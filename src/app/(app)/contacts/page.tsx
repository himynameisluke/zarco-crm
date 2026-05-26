import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Users } from "lucide-react";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
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

function fullName(c: { firstName: string | null; lastName: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ContactsPage() {
  await requireUser();

  const rows = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.updatedAt))
    .limit(200);

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="People you work with."
        action={
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="h-4 w-4" />
              New contact
            </Link>
          </Button>
        }
      />

      <div className="p-4 lg:p-8">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first contact to start building your CRM."
            action={
              <Button asChild>
                <Link href="/contacts/new">
                  <Plus className="h-4 w-4" />
                  New contact
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
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/contacts/${c.id}`} className="hover:underline">
                        {fullName(c)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.title ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(c.updatedAt)}
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
