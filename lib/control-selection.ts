export type GroupSelectionState = "all" | "some" | "none";

export function groupSelectionState(
  selected: Set<string>,
  groupIds: string[],
): GroupSelectionState {
  if (groupIds.length === 0) {
    return "none";
  }
  let selectedCount = 0;
  for (const id of groupIds) {
    if (selected.has(id)) {
      selectedCount += 1;
    }
  }
  if (selectedCount === 0) {
    return "none";
  }
  if (selectedCount === groupIds.length) {
    return "all";
  }
  return "some";
}

export function applyGroupToggle(
  selected: Set<string>,
  groupIds: string[],
  select: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of groupIds) {
    if (select) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}
