import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContact } from "../actions";

export default function NewContactPage() {
  return (
    <div>
      <PageHeader title="New contact" description="Add someone to your CRM." />
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <ContactForm action={createContact} cancelHref="/contacts" />
      </div>
    </div>
  );
}
