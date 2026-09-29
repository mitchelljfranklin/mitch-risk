import { z } from "zod";

export const findingStatusUpdateSchema = z.object({
  status: z.enum(["REMEDIATED", "RISK_ACCEPTED"]),
  resolutionNote: z.string().optional(),
});

export type FindingStatusUpdateInput = z.infer<
  typeof findingStatusUpdateSchema
>;
