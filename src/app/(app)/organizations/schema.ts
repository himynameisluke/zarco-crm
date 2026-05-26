import { z } from "zod";

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  domain: z.string().trim().max(200).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  employeeCount: z.coerce.number().int().min(0).max(10_000_000).optional().or(z.nan()),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
