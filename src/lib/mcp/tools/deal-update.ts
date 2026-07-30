import { z } from "zod";

export const STAGE_VALUES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export const TYPE_VALUES = ["engagement", "sale", "project", "retainer"] as const;

export type DealStageValue = (typeof STAGE_VALUES)[number];

export const UPDATE_DEAL_FIELDS = {
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(TYPE_VALUES).optional(),
  valuePence: z.number().int().min(0).max(1_000_000_000_00).optional(),
  currency: z.string().trim().length(3).optional(),
  closeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
  organizationId: z.string().uuid().nullable().optional(),
  primaryContactId: z.string().uuid().nullable().optional(),
};

/* The exact input shape update_deal registers with the MCP server. Kept here,
   away from the db imports, so the schema itself is unit-testable. */
export const UPDATE_DEAL_INPUT = {
  id: z.string().uuid(),
  stage: z.enum(STAGE_VALUES).optional(),
  ...UPDATE_DEAL_FIELDS,
};

export type UpdateDealPatch = {
  [K in keyof typeof UPDATE_DEAL_FIELDS]?: z.infer<
    (typeof UPDATE_DEAL_FIELDS)[K]
  >;
} & { stage?: DealStageValue };

export type DealUpdatePlan =
  | { error: "no_fields"; message: string }
  | {
      values: Record<string, unknown>;
      changedFields: string[];
      stageMove: DealStageValue | null;
    };

/* Splits a validated update_deal patch into plain column writes and a stage
   move. Stage never goes into `values` directly — stage transitions carry
   extra semantics (stageChangedAt, closeDate on won/lost, lostReason) that the
   handler applies via stageTransitionValues. An empty patch is an ERROR: a
   write tool must never report success while writing nothing, because that is
   exactly how a model ends up telling a user "done" about a no-op. */
export function planDealUpdate(patch: UpdateDealPatch): DealUpdatePlan {
  const { stage, ...fields } = patch;

  const values: Record<string, unknown> = { updatedAt: new Date() };
  const changedFields: string[] = [];
  for (const key of Object.keys(UPDATE_DEAL_FIELDS) as (keyof typeof UPDATE_DEAL_FIELDS)[]) {
    if (fields[key] !== undefined) {
      values[key] = fields[key];
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0 && stage === undefined) {
    return {
      error: "no_fields",
      message:
        "No editable fields were provided, so nothing was updated. Accepted fields: " +
        `stage, ${Object.keys(UPDATE_DEAL_FIELDS).join(", ")}. ` +
        "To move the pipeline stage with an audit reason, use update_deal_stage.",
    };
  }

  return { values, changedFields, stageMove: stage ?? null };
}
