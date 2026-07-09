type EmptyStateProps = {
  icon:
    | "vendors"
    | "assessments"
    | "templates"
    | "frameworks"
    | "findings"
    | "audit"
    | "email";
  title: string;
  description: string;
  compact?: boolean;
};

const SIZE = {
  full: {
    wrapper: "flex flex-col items-center gap-3 py-12 text-center",
    icon: "size-16",
    text: "text-sm",
    desc: "max-w-sm text-sm",
  },
  compact: {
    wrapper: "flex flex-col items-center gap-2 py-6 text-center",
    icon: "size-10",
    text: "text-sm",
    desc: "max-w-xs text-xs",
  },
} as const;

const ICONS: Record<EmptyStateProps["icon"], React.ReactNode> = {
  vendors: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <rect
        x="8"
        y="20"
        width="20"
        height="24"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="36"
        y="12"
        width="20"
        height="32"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="18" cy="28" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="46" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M18 38h-2M18 42h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  assessments: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <path
        d="M12 16h40M12 24h40M12 32h30M12 40h25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="40" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M48 36v4h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <rect
        x="10"
        y="8"
        width="44"
        height="48"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M18 20h28M18 28h28M18 36h20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="44" r="2" fill="currentColor" />
      <circle cx="44" cy="44" r="2" fill="currentColor" />
    </svg>
  ),
  frameworks: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <rect
        x="6"
        y="12"
        width="20"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="38"
        y="12"
        width="20"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="6"
        y="38"
        width="20"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="38"
        y="38"
        width="20"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M22 19h16M22 45h16M16 26v12M48 26v12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  findings: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <path
        d="M32 12v28M32 48v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 28l12 12 12-12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="51" r="1.5" fill="currentColor" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M32 18v14l10 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 64 64" fill="none" className="size-16" aria-hidden="true">
      <rect
        x="8"
        y="16"
        width="48"
        height="32"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 20l24 16 24-16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function EmptyState({
  icon,
  title,
  description,
  compact = false,
}: EmptyStateProps) {
  const styles = compact ? SIZE.compact : SIZE.full;
  return (
    <div className={styles.wrapper}>
      <div className={`text-muted-foreground/50 ${styles.icon}`}>
        {ICONS[icon]}
      </div>
      <p className={`font-medium ${styles.text}`}>{title}</p>
      <p className={`text-muted-foreground ${styles.desc}`}>{description}</p>
    </div>
  );
}
