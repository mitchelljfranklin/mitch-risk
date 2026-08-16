import { describe, expect, it } from "vitest";

import { essentialEight } from "../prisma/seed-data/essential-eight";
import { iso27001 } from "../prisma/seed-data/iso27001";
import { nistCsf } from "../prisma/seed-data/nist-csf";
import { soc2 } from "../prisma/seed-data/soc2";
import { essentialEightFullTemplate } from "../prisma/seed-data/templates/essential-eight";
import { iso27001FullTemplate } from "../prisma/seed-data/templates/iso27001";
import { nistCsfFullTemplate } from "../prisma/seed-data/templates/nist-csf";
import { soc2FullTemplate } from "../prisma/seed-data/templates/soc2";

const nistControlCodes = new Set(
  nistCsf.controls.map((control) => control.code),
);
const isoControlCodes = new Set(
  iso27001.controls.map((control) => control.code),
);
const soc2ControlCodes = new Set(soc2.controls.map((control) => control.code));
const e8ControlCodes = new Set(
  essentialEight.controls.map((control) => control.code),
);

describe("NIST CSF full template seed", () => {
  const questions = nistCsfFullTemplate.sections.flatMap(
    (section) => section.questions,
  );

  it("groups questions into the six NIST functions in order", () => {
    const domains = nistCsf.controls.map((control) => control.domain);
    const sectionTitles = nistCsfFullTemplate.sections.map(
      (section) => section.title,
    );
    expect(sectionTitles).toEqual([...new Set(domains)]);
  });

  it("covers every NIST CSF control exactly once", () => {
    expect(questions.length).toBe(nistCsf.controls.length);

    const codes = questions.map((question) => question.controlCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => nistControlCodes.has(code))).toBe(true);
    expect(codes.length).toBe(nistControlCodes.size);
  });

  it("uses the implementation-status scale with the correct accepted answers", () => {
    for (const question of questions) {
      expect(question.type).toBe("MULTIPLE_CHOICE");
      expect(question.options).toEqual([
        "Not Implemented",
        "Partially Implemented",
        "Largely Implemented",
        "Fully Implemented",
      ]);
      expect(question.expectedAnswer).toEqual([
        "Largely Implemented",
        "Fully Implemented",
      ]);
    }
  });

  it("assigns a valid risk weight to every question", () => {
    const validWeights = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    for (const question of questions) {
      expect(validWeights).toContain(question.riskWeight);
    }
  });
});

describe("ISO 27001 full template seed", () => {
  const questions = iso27001FullTemplate.sections.flatMap(
    (section) => section.questions,
  );

  it("groups questions into the four ISO 27001 themes in order", () => {
    const domains = iso27001.controls.map((control) => control.domain);
    const sectionTitles = iso27001FullTemplate.sections.map(
      (section) => section.title,
    );
    expect(sectionTitles).toEqual([...new Set(domains)]);
  });

  it("covers every ISO 27001 control exactly once", () => {
    expect(questions.length).toBe(iso27001.controls.length);

    const codes = questions.map((question) => question.controlCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => isoControlCodes.has(code))).toBe(true);
    expect(codes.length).toBe(isoControlCodes.size);
  });

  it("uses YES_NO and COMBOBOX with correct expected answers", () => {
    for (const question of questions) {
      if (question.type === "YES_NO") {
        expect(question.expectedAnswer).toBe("YES");
        expect(question.options).toEqual([]);
      } else if (question.type === "COMBOBOX") {
        const accepted = question.expectedAnswer;
        expect(Array.isArray(accepted)).toBe(true);
        expect(question.options?.length ?? 0).toBeGreaterThan(0);
        for (const value of accepted as string[]) {
          expect(question.options).toContain(value);
        }
      } else {
        throw new Error(`unexpected question type: ${question.type}`);
      }
    }
  });

  it("assigns a valid risk weight to every question", () => {
    const validWeights = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    for (const question of questions) {
      expect(validWeights).toContain(question.riskWeight);
    }
  });
});

describe("SOC 2 full template seed", () => {
  const questions = soc2FullTemplate.sections.flatMap(
    (section) => section.questions,
  );

  it("groups questions into the SOC 2 criteria categories in order", () => {
    const domains = soc2.controls.map((control) => control.domain);
    const sectionTitles = soc2FullTemplate.sections.map(
      (section) => section.title,
    );
    expect(sectionTitles).toEqual([...new Set(domains)]);
  });

  it("covers every SOC 2 control exactly once", () => {
    expect(questions.length).toBe(soc2.controls.length);

    const codes = questions.map((question) => question.controlCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => soc2ControlCodes.has(code))).toBe(true);
    expect(codes.length).toBe(soc2ControlCodes.size);
  });

  it("uses the compliance scale with the correct accepted answer", () => {
    for (const question of questions) {
      expect(question.type).toBe("MULTIPLE_CHOICE");
      expect(question.options).toEqual([
        "Does Not Meet",
        "Partially Meets",
        "Meets",
      ]);
      expect(question.expectedAnswer).toEqual(["Meets"]);
    }
  });

  it("assigns a valid risk weight to every question", () => {
    const validWeights = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    for (const question of questions) {
      expect(validWeights).toContain(question.riskWeight);
    }
  });
});

describe("Essential Eight full template seed", () => {
  const questions = essentialEightFullTemplate.sections.flatMap(
    (section) => section.questions,
  );

  it("groups questions into the eight mitigation strategies in order", () => {
    const domains = essentialEight.controls.map((control) => control.domain);
    const sectionTitles = essentialEightFullTemplate.sections.map(
      (section) => section.title,
    );
    expect(sectionTitles).toEqual([...new Set(domains)]);
  });

  it("covers every Essential Eight control exactly once", () => {
    expect(questions.length).toBe(essentialEight.controls.length);

    const codes = questions.map((question) => question.controlCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => e8ControlCodes.has(code))).toBe(true);
    expect(codes.length).toBe(e8ControlCodes.size);
  });

  it("uses YES_NO and COMBOBOX with correct expected answers", () => {
    for (const question of questions) {
      if (question.type === "YES_NO") {
        expect(question.expectedAnswer).toBe("YES");
        expect(question.options).toEqual([]);
      } else if (question.type === "COMBOBOX") {
        const accepted = question.expectedAnswer;
        expect(Array.isArray(accepted)).toBe(true);
        expect(question.options?.length ?? 0).toBeGreaterThan(0);
        for (const value of accepted as string[]) {
          expect(question.options).toContain(value);
        }
      } else {
        throw new Error(`unexpected question type: ${question.type}`);
      }
    }
  });

  it("assigns a valid risk weight to every question", () => {
    const validWeights = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    for (const question of questions) {
      expect(validWeights).toContain(question.riskWeight);
    }
  });
});
