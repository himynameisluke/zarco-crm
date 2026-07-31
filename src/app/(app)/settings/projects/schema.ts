import { z } from "zod";

import { projectTemplateItemSchema } from "@/app/(app)/projects/schema";

export { projectTemplateFormSchema, type ProjectTemplateFormValues } from "@/app/(app)/projects/schema";

export const templateItemsEditorSchema = z.object({
  items: z.array(projectTemplateItemSchema).max(500),
});

export type TemplateItemsEditorValues = z.infer<typeof templateItemsEditorSchema>;

export const defaultPhasesFormSchema = z.object({
  phases: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "At least one phase is required")
    .max(50),
});

export type DefaultPhasesFormValues = z.infer<typeof defaultPhasesFormSchema>;
