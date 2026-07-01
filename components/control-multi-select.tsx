"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlOption = {
  id: string;
  code: string;
  title: string;
  frameworkName: string;
};

type ControlMultiSelectProps = {
  controls: ControlOption[];
  selectedIds: string[];
};

export function ControlMultiSelect({
  controls,
  selectedIds,
}: ControlMultiSelectProps) {
  const [filter, setFilter] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set(selectedIds));

  const normalizedFilter = filter.trim().toLowerCase();

  const frameworks = useMemo(
    () => [...new Set(controls.map((c) => c.frameworkName))].sort(),
    [controls],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ControlOption[]>();
    for (const control of controls) {
      if (frameworkFilter && control.frameworkName !== frameworkFilter) {
        continue;
      }
      const list = map.get(control.frameworkName) ?? [];
      list.push(control);
      map.set(control.frameworkName, list);
    }
    return [...map.entries()];
  }, [controls, frameworkFilter]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function isVisible(control: ControlOption) {
    if (!normalizedFilter) {
      return true;
    }
    return (
      control.code.toLowerCase().includes(normalizedFilter) ||
      control.title.toLowerCase().includes(normalizedFilter)
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Mapped controls</Label>
        <span className="text-muted-foreground text-xs">
          {selected.size} selected
        </span>
      </div>
      <div className="flex gap-2">
        <select
          value={frameworkFilter}
          onChange={(e) => setFrameworkFilter(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-xs"
        >
          <option value="">All frameworks</option>
          {frameworks.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <Input
          placeholder="Filter controls…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="flex-1"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border p-2">
        {grouped.length === 0 ? (
          <p className="text-muted-foreground p-2 text-sm">
            No controls match the current filter.
          </p>
        ) : (
          grouped.map(([frameworkName, frameworkControls]) => (
            <div key={frameworkName} className="mb-2">
              <p className="text-muted-foreground px-1 py-1 text-xs font-medium">
                {frameworkName}
              </p>
              {frameworkControls.map((control) => (
                <label
                  key={control.id}
                  className={cn(
                    "hover:bg-accent/40 flex items-center gap-2 rounded px-1 py-1 text-sm",
                    !isVisible(control) && "hidden",
                  )}
                >
                  <input
                    type="checkbox"
                    name="controlIds"
                    value={control.id}
                    checked={selected.has(control.id)}
                    onChange={(event) =>
                      toggle(control.id, event.target.checked)
                    }
                    className="size-4"
                  />
                  <span className="font-mono text-xs">{control.code}</span>
                  <span className="truncate">{control.title}</span>
                </label>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
