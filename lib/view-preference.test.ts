import { describe, expect, it } from "vitest";

import { parseListView } from "@/lib/view-preference";

describe("parseListView", () => {
  it("returns 'cards' only for the exact value", () => {
    expect(parseListView("cards")).toBe("cards");
  });

  it("defaults to 'rows' for missing or unknown values", () => {
    expect(parseListView("rows")).toBe("rows");
    expect(parseListView(undefined)).toBe("rows");
    expect(parseListView(null)).toBe("rows");
    expect(parseListView("")).toBe("rows");
    expect(parseListView("grid")).toBe("rows");
  });
});
