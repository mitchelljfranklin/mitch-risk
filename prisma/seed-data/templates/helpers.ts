import type { RiskWeight } from "../../generated/prisma/client";
import { type TemplateQuestionSeed } from "../types";

export function yesNoQuestion(
  text: string,
  controlCode: string,
  riskWeight: RiskWeight,
): TemplateQuestionSeed {
  return {
    text,
    type: "YES_NO",
    riskWeight,
    options: [],
    expectedAnswer: "YES",
    controlCode,
  };
}

export function frequencyQuestion(
  text: string,
  controlCode: string,
  riskWeight: RiskWeight,
  options: string[],
  accepted: string[],
): TemplateQuestionSeed {
  return {
    text,
    type: "COMBOBOX",
    riskWeight,
    options,
    expectedAnswer: accepted,
    controlCode,
  };
}
