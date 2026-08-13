import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatPercent } from "@/lib/utils";

type RagThresholds = { green: number; amber: number };

type FrameworkReportData = {
  organizationName: string;
  vendorName: string;
  vendorContact: string;
  vendorTier: string | null;
  frameworkName: string;
  frameworkVersion: string;
  generatedDate: string;
  overallScore: number | null;
  ragThresholds: RagThresholds;
  domains: {
    domain: string;
    current: number;
    previous: number | null;
  }[];
  controls: {
    domain: string;
    code: string;
    title: string;
    complianceRatio: number;
    rag: "green" | "amber" | "red" | "none";
  }[];
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 8,
  },
  orgName: { fontSize: 12, color: "#6b7280" },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  subtitle: { fontSize: 12, color: "#374151", marginTop: 4 },
  vendorInfo: { fontSize: 10, color: "#374151", marginTop: 8 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1 solid #e5e7eb",
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 4,
  },
  summaryItem: { fontSize: 10, color: "#374151" },
  summaryValue: { fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "2 solid #d1d5db",
    paddingVertical: 4,
    backgroundColor: "#f9fafb",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 4,
  },
  domainCol: { width: "40%", fontSize: 9 },
  valueCol: { width: "20%", fontSize: 9 },
  codeCol: { width: "14%", fontSize: 9, fontFamily: "Courier" },
  titleCol: { width: "56%", fontSize: 9 },
  ratioCol: { width: "15%", fontSize: 9 },
  statusCol: { width: "15%", fontSize: 9 },
  label: { fontWeight: "bold", fontSize: 9 },
  domainHeading: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
    color: "#374151",
  },
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

function scoreColor(score: number | null, thresholds: RagThresholds): string {
  if (score === null) return "#6b7280";
  if (score >= thresholds.green) return "#16a34a";
  if (score >= thresholds.amber) return "#d97706";
  return "#dc2626";
}

function domainColor(value: number, thresholds: RagThresholds): string {
  const ratio = value / 100;
  if (ratio >= thresholds.green) return "#16a34a";
  if (ratio >= thresholds.amber) return "#d97706";
  return "#dc2626";
}

function changeColor(change: number | null): string {
  if (change === null) return "#6b7280";
  if (change > 0) return "#16a34a";
  if (change < 0) return "#dc2626";
  return "#6b7280";
}

function ragColor(rag: "green" | "amber" | "red" | "none"): string {
  switch (rag) {
    case "green":
      return "#16a34a";
    case "amber":
      return "#d97706";
    case "red":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}

function ragLabel(rag: "green" | "amber" | "red" | "none"): string {
  switch (rag) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "Not assessed";
  }
}

function changeLabel(change: number | null): string {
  if (change === null) return "—";
  if (change > 0) return `+${change}`;
  return String(change);
}

function FrameworkReportDocument({ data }: { data: FrameworkReportData }) {
  const grouped = new Map<string, typeof data.controls>();
  for (const control of data.controls) {
    const list = grouped.get(control.domain) ?? [];
    list.push(control);
    grouped.set(control.domain, list);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{data.organizationName}</Text>
          <Text style={styles.title}>{data.vendorName}</Text>
          <Text style={styles.subtitle}>
            {data.frameworkName} {data.frameworkVersion} — Compliance Report
          </Text>
          <Text style={styles.vendorInfo}>
            {data.vendorContact}
            {data.vendorTier ? ` | Tier: ${data.vendorTier}` : ""}
            {` | Generated: ${data.generatedDate}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>
              Overall score:{" "}
              <Text
                style={[
                  styles.summaryValue,
                  { color: scoreColor(data.overallScore, data.ragThresholds) },
                ]}
              >
                {data.overallScore !== null
                  ? formatPercent(data.overallScore)
                  : "Not scored"}
              </Text>
            </Text>
            <Text style={styles.summaryItem}>
              Domains assessed:{" "}
              <Text style={styles.summaryValue}>{data.domains.length}</Text>
            </Text>
            <Text style={styles.summaryItem}>
              Controls mapped:{" "}
              <Text style={styles.summaryValue}>{data.controls.length}</Text>
            </Text>
          </View>
        </View>

        {data.domains.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Domain compliance</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.domainCol}>
                <Text style={styles.label}>Domain</Text>
              </Text>
              <Text style={styles.valueCol}>
                <Text style={styles.label}>Current</Text>
              </Text>
              <Text style={styles.valueCol}>
                <Text style={styles.label}>Previous</Text>
              </Text>
              <Text style={styles.valueCol}>
                <Text style={styles.label}>Change</Text>
              </Text>
            </View>
            {data.domains.map((domain) => {
              const change =
                domain.previous === null
                  ? null
                  : domain.current - domain.previous;
              return (
                <View key={domain.domain} style={styles.tableRow}>
                  <Text style={styles.domainCol}>{domain.domain}</Text>
                  <Text
                    style={[
                      styles.valueCol,
                      {
                        color: domainColor(domain.current, data.ragThresholds),
                      },
                    ]}
                  >
                    {domain.current}%
                  </Text>
                  <Text style={styles.valueCol}>
                    {domain.previous === null ? "—" : `${domain.previous}%`}
                  </Text>
                  <Text
                    style={[styles.valueCol, { color: changeColor(change) }]}
                  >
                    {changeLabel(change)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {data.controls.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Control heatmap</Text>
            {[...grouped.entries()].map(([domain, domainControls]) => (
              <View key={domain}>
                <Text style={styles.domainHeading}>{domain}</Text>
                <View style={styles.tableHeader}>
                  <Text style={styles.codeCol}>
                    <Text style={styles.label}>Control</Text>
                  </Text>
                  <Text style={styles.titleCol}>
                    <Text style={styles.label}>Title</Text>
                  </Text>
                  <Text style={styles.ratioCol}>
                    <Text style={styles.label}>Compliance</Text>
                  </Text>
                  <Text style={styles.statusCol}>
                    <Text style={styles.label}>Status</Text>
                  </Text>
                </View>
                {domainControls.map((control) => (
                  <View key={control.code} style={styles.tableRow}>
                    <Text style={styles.codeCol}>{control.code}</Text>
                    <Text style={styles.titleCol}>{control.title}</Text>
                    <Text
                      style={[
                        styles.ratioCol,
                        { color: ragColor(control.rag) },
                      ]}
                    >
                      {control.rag === "none"
                        ? "—"
                        : formatPercent(control.complianceRatio)}
                    </Text>
                    <Text
                      style={[
                        styles.statusCol,
                        { color: ragColor(control.rag) },
                      ]}
                    >
                      {ragLabel(control.rag)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function generateFrameworkReportPdf(
  vendorId: string,
  frameworkId: string,
): Promise<Buffer | null> {
  const { getVendor } = await import("@/lib/db/vendors");
  const { getFramework } = await import("@/lib/db/frameworks");
  const { getVendorHeatmap, getVendorDomainRadar } =
    await import("@/lib/db/compliance");
  const { getOrganizationSettings, getScoringSettings } =
    await import("@/lib/settings");

  const [vendor, framework, controls, radar, org, scoring] = await Promise.all([
    getVendor(vendorId),
    getFramework(frameworkId),
    getVendorHeatmap(vendorId, frameworkId),
    getVendorDomainRadar(vendorId, frameworkId),
    getOrganizationSettings(),
    getScoringSettings(),
  ]);

  if (!vendor || !framework) {
    return null;
  }

  const data: FrameworkReportData = {
    organizationName: org.name,
    vendorName: vendor.name,
    vendorContact: vendor.contactEmail,
    vendorTier: vendor.tier,
    frameworkName: framework.name,
    frameworkVersion: framework.version,
    generatedDate: new Date().toISOString().slice(0, 10),
    overallScore: vendor.overallScore,
    ragThresholds: scoring.ragThresholds,
    domains: radar.domains,
    controls: controls.map((control) => ({
      domain: control.domain,
      code: control.code,
      title: control.title,
      complianceRatio: control.complianceRatio,
      rag: control.rag,
    })),
  };

  return renderToBuffer(<FrameworkReportDocument data={data} />);
}
