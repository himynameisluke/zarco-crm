import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  linkedinUrl: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
