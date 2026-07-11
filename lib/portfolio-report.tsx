import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatDate, formatPercent } from "@/lib/utils";

type PortfolioPdfData = {
  organizationName: string;
  generatedDate: string;
  vendorCount: number;
  averageScore: number | null;
  openFindings: number;
  needsAttention: number;
  scoreDistribution: {
    green: number;
    amber: number;
    red: number;
    unscored: number;
  };
  vendorsByTier: Record<string, number>;
  assessmentStatusCounts: Record<string, number>;
  vendors: {
    name: string;
    tier: string | null;
    overallScore: number | null;
    latestAssessmentDate: Date | null;
    assessmentCount: number;
  }[];
  topControls: {
    code: string;
    title: string;
    vendorCount: number;
  }[];
};

const TIER_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function scoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 0.85) return "#16a34a";
  if (score >= 0.6) return "#d97706";
  return "#dc2626";
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 60,
    marginBottom: 8,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 40,
  },
  orgName: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  statBox: {
    width: "22%",
    border: "1 solid #e5e7eb",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  statLabel: { fontSize: 8, color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "bold" },
  table: { width: "100%", marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "2 solid #d1d5db",
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 5,
  },
  colName: { width: "28%", fontSize: 9 },
  colTier: { width: "14%", fontSize: 9 },
  colScore: { width: "14%", fontSize: 9 },
  colDate: { width: "22%", fontSize: 9 },
  colCount: { width: "12%", fontSize: 9 },
  colCode: { width: "12%", fontSize: 9, fontFamily: "Courier" },
  colControlTitle: { width: "56%", fontSize: 9 },
  colControlCount: { width: "20%", fontSize: 9 },
  label: { fontWeight: "bold", fontSize: 9 },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  distLabel: { width: 80, fontSize: 9 },
  distBar: { height: 8, borderRadius: 2 },
  distValue: { fontSize: 9, marginLeft: 4 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
});

function StatsSummary({ data }: { data: PortfolioPdfData }) {
  return (
    <View style={styles.statGrid}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Vendors</Text>
        <Text style={styles.statValue}>{data.vendorCount}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Average score</Text>
        <Text
          style={[styles.statValue, { color: scoreColor(data.averageScore) }]}
        >
          {data.averageScore !== null ? formatPercent(data.averageScore) : "—"}
        </Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Open findings</Text>
        <Text style={[styles.statValue, { color: "#dc2626" }]}>
          {data.openFindings}
        </Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>Needs attention</Text>
        <Text style={[styles.statValue, { color: "#d97706" }]}>
          {data.needsAttention}
        </Text>
      </View>
    </View>
  );
}

function ScoreDistribution({ data }: { data: PortfolioPdfData }) {
  const dist = data.scoreDistribution;
  const total = dist.green + dist.amber + dist.red + dist.unscored || 1;
  const maxWidth = 200;

  return (
    <View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>Green (&ge;85%)</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (dist.green / total) * maxWidth,
              backgroundColor: "#16a34a",
            },
          ]}
        />
        <Text style={styles.distValue}>{dist.green}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>Amber (60–84%)</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (dist.amber / total) * maxWidth,
              backgroundColor: "#d97706",
            },
          ]}
        />
        <Text style={styles.distValue}>{dist.amber}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>Red (&lt;60%)</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (dist.red / total) * maxWidth,
              backgroundColor: "#dc2626",
            },
          ]}
        />
        <Text style={styles.distValue}>{dist.red}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>Unscored</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (dist.unscored / total) * maxWidth,
              backgroundColor: "#9ca3af",
            },
          ]}
        />
        <Text style={styles.distValue}>{dist.unscored}</Text>
      </View>
    </View>
  );
}

function VendorsTable({ data }: { data: PortfolioPdfData }) {
  const sorted = [...data.vendors].sort(
    (a, b) => (a.overallScore ?? Infinity) - (b.overallScore ?? Infinity),
  );

  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.colName}>
          <Text style={styles.label}>Vendor</Text>
        </Text>
        <Text style={styles.colTier}>
          <Text style={styles.label}>Tier</Text>
        </Text>
        <Text style={styles.colScore}>
          <Text style={styles.label}>Score</Text>
        </Text>
        <Text style={styles.colDate}>
          <Text style={styles.label}>Last assessed</Text>
        </Text>
        <Text style={styles.colCount}>
          <Text style={styles.label}>Assessments</Text>
        </Text>
      </View>
      {sorted.map((vendor, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.colName}>{vendor.name}</Text>
          <Text style={styles.colTier}>
            {vendor.tier ? (TIER_LABELS[vendor.tier] ?? vendor.tier) : "—"}
          </Text>
          <Text
            style={[
              styles.colScore,
              { color: scoreColor(vendor.overallScore) },
            ]}
          >
            {vendor.overallScore !== null
              ? formatPercent(vendor.overallScore)
              : "—"}
          </Text>
          <Text style={styles.colDate}>
            {vendor.latestAssessmentDate
              ? formatDate(vendor.latestAssessmentDate)
              : "Not assessed"}
          </Text>
          <Text style={styles.colCount}>{vendor.assessmentCount}</Text>
        </View>
      ))}
    </View>
  );
}

function PortfolioPdfDocument({ data }: { data: PortfolioPdfData }) {
  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={[styles.page, { justifyContent: "center" }]}>
        <Text style={styles.orgName}>{data.organizationName}</Text>
        <Text style={styles.coverTitle}>Vendor Risk{"\n"}Portfolio Report</Text>
        <Text style={styles.coverSubtitle}>Generated {data.generatedDate}</Text>
        <StatsSummary data={data} />
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Distribution page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Score distribution</Text>
        <ScoreDistribution data={data} />

        <Text style={styles.sectionTitle}>Vendors by tier</Text>
        {Object.entries(data.vendorsByTier).map(([tier, count]) => (
          <View key={tier} style={styles.distRow}>
            <Text style={styles.distLabel}>{TIER_LABELS[tier] ?? tier}</Text>
            <Text style={styles.distValue}>{count}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Assessments by status</Text>
        {Object.entries(data.assessmentStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => (
            <View key={status} style={styles.distRow}>
              <Text style={styles.distLabel}>{status}</Text>
              <Text style={styles.distValue}>{count}</Text>
            </View>
          ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Vendor table (may span multiple pages) */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Vendors ({data.vendorCount})</Text>
        <VendorsTable data={data} />

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Top deficient controls */}
      {data.topControls.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Top deficient controls ({data.topControls.length})
          </Text>
          <View>
            <View style={styles.tableHeader}>
              <Text style={styles.colCode}>
                <Text style={styles.label}>Control</Text>
              </Text>
              <Text style={styles.colControlTitle}>
                <Text style={styles.label}>Title</Text>
              </Text>
              <Text style={styles.colControlCount}>
                <Text style={styles.label}>Vendors affected</Text>
              </Text>
            </View>
            {data.topControls.map((control, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colCode}>{control.code}</Text>
                <Text style={styles.colControlTitle}>{control.title}</Text>
                <Text style={styles.colControlCount}>
                  {control.vendorCount} / {data.vendorCount}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </Page>
      ) : null}
    </Document>
  );
}

export async function generatePortfolioPdf(): Promise<Buffer> {
  const { getDashboardData } = await import("@/lib/db/compliance");
  const { getOrganizationSettings } = await import("@/lib/settings");

  const [dashboard, org] = await Promise.all([
    getDashboardData(),
    getOrganizationSettings(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const vendorAssessmentCounts = dashboard.vendors.reduce((acc, vendor) => {
    acc.set(vendor.id, vendor.overdueCount);
    return acc;
  }, new Map<string, number>());

  const data: PortfolioPdfData = {
    organizationName: org.name,
    generatedDate: today,
    vendorCount: dashboard.vendorCount,
    averageScore: dashboard.averageScore,
    openFindings: dashboard.openFindings,
    needsAttention: dashboard.needsAttention,
    scoreDistribution: dashboard.scoreDistribution,
    vendorsByTier: dashboard.vendorsByTier,
    assessmentStatusCounts: dashboard.assessmentStatusCounts,
    vendors: dashboard.vendors.map((vendor) => ({
      name: vendor.name,
      tier: vendor.tier,
      overallScore: vendor.overallScore,
      latestAssessmentDate: vendor.latestAssessmentDate,
      assessmentCount: vendorAssessmentCounts.get(vendor.id) ?? 0,
    })),
    topControls: dashboard.topDeficientControls.map((control) => ({
      code: control.code,
      title: control.title,
      vendorCount: control.vendorCount,
    })),
  };

  return renderToBuffer(<PortfolioPdfDocument data={data} />);
}
