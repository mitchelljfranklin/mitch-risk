function normalizeData(data: number[]): number[] {
  if (data.length === 0) return [];
  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max === min) return data.map(() => 0.5);
  return data.map((point) => (point - min) / (max - min));
}

function SparklineSvg({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (data.length < 2) return null;

  const normalized = normalizeData(data);
  const width = data.length - 1;
  const height = 20;
  const padding = 2;

  const points = normalized
    .map(
      (point, index) =>
        `${padding + (index / width) * (100 - padding * 2)},${padding + (1 - point) * (height - padding * 2)}`,
    )
    .join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      fill="none"
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export { SparklineSvg };
