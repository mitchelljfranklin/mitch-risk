import type { QuestionType, RiskWeight } from "../generated/prisma/client";

export type ControlSeed = {
  domain: string;
  code: string;
  title: string;
  guidance: string;
  isSharedResponsibility?: boolean;
};

export type FrameworkSeed = {
  name: string;
  version: string;
  description: string;
  controls: ControlSeed[];
};

export type TemplateQuestionSeed = {
  text: string;
  type: QuestionType;
  riskWeight: RiskWeight;
  options?: string[];
  expectedAnswer: string | number | string[];
  controlCode: string;
};

export type TemplateSectionSeed = {
  title: string;
  questions: TemplateQuestionSeed[];
};

export type TemplateSeed = {
  id: string;
  name: string;
  description: string;
  frameworkName: string;
  sections: TemplateSectionSeed[];
};
