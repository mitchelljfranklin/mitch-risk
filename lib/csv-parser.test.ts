import { describe, expect, it } from "vitest";

import { parseCsvRows, parseCsvWithHeaders } from "@/lib/csv-parser";

describe("csv-parser", () => {
  describe("parseCsvRows", () => {
    it("parses a single row with no quotes", () => {
      const rows = parseCsvRows("a,b,c");
      expect(rows).toEqual([["a", "b", "c"]]);
    });

    it("parses multiple rows", () => {
      const rows = parseCsvRows("a,b\nc,d\ne,f");
      expect(rows).toEqual([
        ["a", "b"],
        ["c", "d"],
        ["e", "f"],
      ]);
    });

    it("handles CRLF line endings", () => {
      const rows = parseCsvRows("a,b\r\nc,d");
      expect(rows).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    it("handles quoted fields containing commas", () => {
      const rows = parseCsvRows('"hello, world",b');
      expect(rows).toEqual([["hello, world", "b"]]);
    });

    it("handles quoted fields containing newlines", () => {
      const rows = parseCsvRows('"line1\nline2",b');
      expect(rows).toEqual([["line1\nline2", "b"]]);
    });

    it("handles escaped quotes (double-quote)", () => {
      const rows = parseCsvRows('"say ""hello""",b');
      expect(rows).toEqual([['say "hello"', "b"]]);
    });

    it("handles empty rows (preserves them as rows with empty fields)", () => {
      const rows = parseCsvRows("\n\n");
      expect(rows).toEqual([[""], [""]]);
    });

    it("handles trailing newline (produces an empty row)", () => {
      const rows = parseCsvRows("a,b\n\n");
      expect(rows).toEqual([["a", "b"], [""]]);
    });

    it("returns an empty array for empty input", () => {
      const rows = parseCsvRows("");
      expect(rows).toEqual([]);
    });

    it("handles a row with empty fields", () => {
      const rows = parseCsvRows("a,,c");
      expect(rows).toEqual([["a", "", "c"]]);
    });

    it("handles BOM character by treating it as part of the first cell", () => {
      const text = "\ufeffname,email\nJohn,john@example.com";
      const rows = parseCsvRows(text);
      expect(rows.length).toBe(2);
      expect(rows[0][0]).toBe("\ufeffname");
    });

    it("handles mixed quoted and unquoted fields", () => {
      const rows = parseCsvRows('plain,"quoted, with comma",plain');
      expect(rows).toEqual([["plain", "quoted, with comma", "plain"]]);
    });
  });

  describe("parseCsvWithHeaders", () => {
    it("parses headers and rows", () => {
      const result = parseCsvWithHeaders("name,email\nJohn,john@test.com");
      expect(result).toEqual([{ name: "John", email: "john@test.com" }]);
    });

    it("trims whitespace from headers and values", () => {
      const result = parseCsvWithHeaders(
        " Name , Email \n John , john@test.com ",
      );
      expect(result).toEqual([{ name: "John", email: "john@test.com" }]);
    });

    it("lowercases header keys", () => {
      const result = parseCsvWithHeaders("NAME,EMAIL\nJohn,john@test.com");
      expect(result).toEqual([{ name: "John", email: "john@test.com" }]);
    });

    it("returns empty array when only headers exist", () => {
      const result = parseCsvWithHeaders("name,email");
      expect(result).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      const result = parseCsvWithHeaders("");
      expect(result).toEqual([]);
    });

    it("skips empty rows", () => {
      const result = parseCsvWithHeaders(
        "name,email\n\nJohn,john@test.com\n,,\n",
      );
      expect(result).toEqual([{ name: "John", email: "john@test.com" }]);
    });

    it("handles missing columns in rows (fills with empty string)", () => {
      const result = parseCsvWithHeaders("name,email,tier\nJohn");
      expect(result).toEqual([{ name: "John", email: "", tier: "" }]);
    });

    it("handles extra columns in rows (ignores extras)", () => {
      const result = parseCsvWithHeaders(
        "name,email\nJohn,john@test.com,extra",
      );
      expect(result).toEqual([{ name: "John", email: "john@test.com" }]);
    });

    it("handles quoted values in header-keyed data", () => {
      const result = parseCsvWithHeaders(
        'name,email\n"John, Doe",john@test.com',
      );
      expect(result).toEqual([{ name: "John, Doe", email: "john@test.com" }]);
    });
  });
});
