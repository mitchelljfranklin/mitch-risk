export type ListView = "rows" | "cards";

export const VENDOR_VIEW_COOKIE = "vendors_view";

export const LIST_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function parseListView(value: string | undefined | null): ListView {
  return value === "cards" ? "cards" : "rows";
}
