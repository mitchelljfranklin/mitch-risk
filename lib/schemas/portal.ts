import { z } from "zod";

export const portalAnswerSchema = z.object({
  assessmentQuestionId: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()),
  ]),
  isNotApplicable: z.boolean().default(false),
});

export const saveProgressSchema = z.object({
  answers: z.array(portalAnswerSchema),
});

export type PortalAnswerInput = z.infer<typeof portalAnswerSchema>;
export type SaveProgressInput = z.infer<typeof saveProgressSchema>;
