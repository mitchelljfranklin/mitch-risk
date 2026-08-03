/**
 * Parses CSV text into raw rows of strings.
 * Handles quoted fields, escaped quotes (""), and CRLF line endings.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let isInQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isInQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          isInQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      isInQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      current = "";
      if (row.length > 0) {
        rows.push(row);
        row = [];
      }
    } else if (char === "\r") {
      continue;
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.length > 0 && row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

/**
 * Parses CSV text into an array of header-keyed records.
 * The first row is treated as the header.
 */
export function parseCsvWithHeaders(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 0 || values.every((value) => value.trim() === ""))
      continue;
    const entry: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      entry[headers[j]] = (values[j] ?? "").trim();
    }
    result.push(entry);
  }

  return result;
}
