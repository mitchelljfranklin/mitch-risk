import { z } from "zod";

export const AUTOMATED_FINDING_DESCRIPTION =
  "The vendor's answer did not meet the expected response.";

export const findingStatusUpdateSchema = z.object({
  status: z.enum(["REMEDIATED", "RISK_ACCEPTED"]),
  resolutionNote: z.string().optional(),
});

export type FindingStatusUpdateInput = z.infer<
  typeof findingStatusUpdateSchema
>;
