import { describe, expect, it } from "vitest";

import { applyGroupToggle, groupSelectionState } from "@/lib/control-selection";

describe("groupSelectionState", () => {
  it("returns 'none' for an empty group", () => {
    expect(groupSelectionState(new Set(["a"]), [])).toBe("none");
  });

  it("returns 'none' when no group ids are selected", () => {
    expect(groupSelectionState(new Set(["x"]), ["a", "b"])).toBe("none");
  });

  it("returns 'some' when a subset is selected", () => {
    expect(groupSelectionState(new Set(["a"]), ["a", "b", "c"])).toBe("some");
  });

  it("returns 'all' when every group id is selected", () => {
    expect(groupSelectionState(new Set(["a", "b", "c"]), ["a", "b", "c"])).toBe(
      "all",
    );
  });
});

describe("applyGroupToggle", () => {
  it("adds every group id when selecting", () => {
    const result = applyGroupToggle(new Set(["x"]), ["a", "b"], true);
    expect([...result].sort()).toEqual(["a", "b", "x"]);
  });

  it("removes every group id when clearing", () => {
    const result = applyGroupToggle(
      new Set(["a", "b", "x"]),
      ["a", "b"],
      false,
    );
    expect([...result]).toEqual(["x"]);
  });

  it("does not mutate the input set", () => {
    const original = new Set(["a"]);
    applyGroupToggle(original, ["b"], true);
    expect([...original]).toEqual(["a"]);
  });
});
