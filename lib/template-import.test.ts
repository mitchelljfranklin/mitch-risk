import { describe, expect, it } from "vitest";

import { findAmbiguousControlCodes } from "@/lib/db/templates";

describe("findAmbiguousControlCodes", () => {
  it("returns codes that match more than one control", () => {
    const controls = [{ code: "A.5.1" }, { code: "CC1.1" }, { code: "A.5.1" }];
    expect(findAmbiguousControlCodes(controls)).toEqual(["A.5.1"]);
  });

  it("returns an empty array when every code is unique", () => {
    const controls = [
      { code: "A.5.1" },
      { code: "CC1.1" },
      { code: "GV.OC-01" },
    ];
    expect(findAmbiguousControlCodes(controls)).toEqual([]);
  });

  it("sorts ambiguous codes alphabetically for stable messaging", () => {
    const controls = [
      { code: "ZZ.9" },
      { code: "AA.1" },
      { code: "ZZ.9" },
      { code: "AA.1" },
    ];
    expect(findAmbiguousControlCodes(controls)).toEqual(["AA.1", "ZZ.9"]);
  });
});
