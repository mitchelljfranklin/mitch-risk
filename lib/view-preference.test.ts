import { describe, expect, it } from "vitest";

import { parseListView } from "@/lib/view-preference";

describe("parseListView", () => {
  it("returns 'rows' only for the exact value", () => {
    expect(parseListView("rows")).toBe("rows");
  });

  it("defaults to 'cards' for missing or unknown values", () => {
    expect(parseListView("cards")).toBe("cards");
    expect(parseListView(undefined)).toBe("cards");
    expect(parseListView(null)).toBe("cards");
    expect(parseListView("")).toBe("cards");
    expect(parseListView("grid")).toBe("cards");
  });
});
