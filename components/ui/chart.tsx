"use client";

import {
  createContext,
  useContext,
  useId,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

type ChartConfig = Record<string, { label: string; color?: string }>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextProps | null>(null);

function useChart() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: ComponentProps<"div"> & {
  config: ChartConfig;
  children: ReactElement;
}) {
  const uniqueId = useId();
  const chartId = id ?? uniqueId;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.values(THEMES)
          .map(
            (prefix) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, cfg]) => {
    const color = cfg.color ?? "";
    return `  --color-${key}: ${color};`;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
}

function ChartTooltip({
  content,
  ...props
}: ComponentProps<typeof RechartsPrimitive.Tooltip>) {
  return (
    <RechartsPrimitive.Tooltip cursor={false} {...props} content={content} />
  );
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: unknown;
    payload?: Record<string, unknown>;
  }>;
  className?: string;
  indicator?: "dot" | "line" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  label?: string;
  labelFormatter?: (value: unknown) => ReactNode;
  labelClassName?: string;
  formatter?: (value: unknown, name?: string) => ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel ? (
        <div
          className={cn("text-muted-foreground font-medium", labelClassName)}
        >
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const itemConfig = config[item.name ?? ""];
          const color = itemConfig?.color ?? "var(--primary)";
          return (
            <div key={item.name} className="flex items-center gap-2">
              {!hideIndicator ? (
                <span
                  className={cn(
                    "shrink-0 rounded-[2px]",
                    indicator === "dot" && "size-2.5",
                    indicator === "line" && "w-1",
                    indicator === "dashed" &&
                      "w-0 border-[1.5px] border-dashed bg-transparent",
                  )}
                  style={{
                    backgroundColor: indicator === "dot" ? color : undefined,
                    borderColor: color,
                  }}
                />
              ) : null}
              <span className="text-muted-foreground flex flex-1 items-center gap-1">
                {itemConfig?.label ?? item.name}
              </span>
              <span className="font-mono font-medium tabular-nums">
                {formatter
                  ? formatter(item.value, item.name)
                  : String(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
