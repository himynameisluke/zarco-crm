import { Users } from "lucide-react";

import { Topbar } from "@/components/nav/topbar";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContact } from "../actions";

export default function NewContactPage() {
  return (
    <>
      <Topbar
        crumbs={[
          { icon: Users, label: "Contacts" },
          { label: "New" },
        ]}
      />
      <main className="screen flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <div className="mx-auto max-w-3xl p-4 lg:p-8">
          <ContactForm action={createContact} cancelHref="/contacts" />
        </div>
      </main>
    </>
  );
}
