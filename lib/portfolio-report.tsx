import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { formatPercent } from "@/lib/utils";
import { localeDirection } from "@/lib/i18n/config";
import {
  pdfFontFamily,
  registerPdfFonts,
  type PdfFontFamily,
} from "@/lib/pdf/fonts";
import {
  type PdfFormatter,
  type PdfTranslate,
  translateOrRaw,
} from "@/lib/pdf-i18n";

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

function StatsSummary({
  data,
  translations,
}: {
  data: PortfolioPdfData;
  translations: PdfTranslate;
}) {
  return (
    <View style={styles.statGrid}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>
          {translations("portfolio.vendors")}
        </Text>
        <Text style={styles.statValue}>{data.vendorCount}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>
          {translations("portfolio.averageScore")}
        </Text>
        <Text
          style={[styles.statValue, { color: scoreColor(data.averageScore) }]}
        >
          {data.averageScore !== null ? formatPercent(data.averageScore) : "—"}
        </Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>
          {translations("portfolio.openFindings")}
        </Text>
        <Text style={[styles.statValue, { color: "#dc2626" }]}>
          {data.openFindings}
        </Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>
          {translations("portfolio.needsAttention")}
        </Text>
        <Text style={[styles.statValue, { color: "#d97706" }]}>
          {data.needsAttention}
        </Text>
      </View>
    </View>
  );
}

function ScoreDistribution({
  data,
  translations,
}: {
  data: PortfolioPdfData;
  translations: PdfTranslate;
}) {
  const distribution = data.scoreDistribution;
  const totalCount =
    distribution.green +
      distribution.amber +
      distribution.red +
      distribution.unscored || 1;
  const maxWidth = 200;

  return (
    <View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>{translations("portfolio.green")}</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (distribution.green / totalCount) * maxWidth,
              backgroundColor: "#16a34a",
            },
          ]}
        />
        <Text style={styles.distValue}>{distribution.green}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>{translations("portfolio.amber")}</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (distribution.amber / totalCount) * maxWidth,
              backgroundColor: "#d97706",
            },
          ]}
        />
        <Text style={styles.distValue}>{distribution.amber}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>{translations("portfolio.red")}</Text>
        <View
          style={[
            styles.distBar,
            {
              width: (distribution.red / totalCount) * maxWidth,
              backgroundColor: "#dc2626",
            },
          ]}
        />
        <Text style={styles.distValue}>{distribution.red}</Text>
      </View>
      <View style={styles.distRow}>
        <Text style={styles.distLabel}>
          {translations("portfolio.unscored")}
        </Text>
        <View
          style={[
            styles.distBar,
            {
              width: (distribution.unscored / totalCount) * maxWidth,
              backgroundColor: "#9ca3af",
            },
          ]}
        />
        <Text style={styles.distValue}>{distribution.unscored}</Text>
      </View>
    </View>
  );
}

function VendorsTable({
  data,
  translations,
  dateFormatter,
}: {
  data: PortfolioPdfData;
  translations: PdfTranslate;
  dateFormatter: PdfFormatter;
}) {
  const sortedVendors = [...data.vendors].sort(
    (firstVendor, secondVendor) =>
      (firstVendor.overallScore ?? Infinity) -
      (secondVendor.overallScore ?? Infinity),
  );

  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.colName}>
          <Text style={styles.label}>{translations("portfolio.vendor")}</Text>
        </Text>
        <Text style={styles.colTier}>
          <Text style={styles.label}>{translations("portfolio.tier")}</Text>
        </Text>
        <Text style={styles.colScore}>
          <Text style={styles.label}>{translations("portfolio.score")}</Text>
        </Text>
        <Text style={styles.colDate}>
          <Text style={styles.label}>
            {translations("portfolio.lastAssessed")}
          </Text>
        </Text>
        <Text style={styles.colCount}>
          <Text style={styles.label}>
            {translations("portfolio.assessments")}
          </Text>
        </Text>
      </View>
      {sortedVendors.map((vendor, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.colName}>{vendor.name}</Text>
          <Text style={styles.colTier}>
            {vendor.tier
              ? translateOrRaw(
                  translations,
                  `tiers.${vendor.tier}`,
                  TIER_LABELS[vendor.tier] ?? vendor.tier,
                )
              : "—"}
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
              ? dateFormatter.dateTime(vendor.latestAssessmentDate, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : translations("portfolio.notAssessed")}
          </Text>
          <Text style={styles.colCount}>{vendor.assessmentCount}</Text>
        </View>
      ))}
    </View>
  );
}

function PortfolioPdfDocument({
  data,
  translations,
  dateFormatter,
  fontFamily,
  direction,
}: {
  data: PortfolioPdfData;
  translations: PdfTranslate;
  dateFormatter: PdfFormatter;
  fontFamily: PdfFontFamily;
  direction: "ltr" | "rtl";
}) {
  const pageStyle = [styles.page, { fontFamily, direction }];

  return (
    <Document>
      {/* Cover page */}
      <Page
        size="A4"
        style={[
          styles.page,
          { fontFamily, direction, justifyContent: "center" },
        ]}
      >
        <Text style={styles.orgName}>{data.organizationName}</Text>
        <Text style={styles.coverTitle}>{translations("portfolio.title")}</Text>
        <Text style={styles.coverSubtitle}>
          {translations("common.generated", {
            date: dateFormatter.dateTime(new Date(data.generatedDate), {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }),
          })}
        </Text>
        <StatsSummary data={data} translations={translations} />
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            translations("common.pageOf", {
              page: pageNumber,
              total: totalPages,
            })
          }
          fixed
        />
      </Page>

      {/* Distribution page */}
      <Page size="A4" style={pageStyle}>
        <Text style={styles.sectionTitle}>
          {translations("portfolio.scoreDistribution")}
        </Text>
        <ScoreDistribution data={data} translations={translations} />

        <Text style={styles.sectionTitle}>
          {translations("portfolio.vendorsByTier")}
        </Text>
        {Object.entries(data.vendorsByTier).map(([tier, count]) => (
          <View key={tier} style={styles.distRow}>
            <Text style={styles.distLabel}>
              {translateOrRaw(
                translations,
                `tiers.${tier}`,
                TIER_LABELS[tier] ?? tier,
              )}
            </Text>
            <Text style={styles.distValue}>{count}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          {translations("portfolio.assessmentsByStatus")}
        </Text>
        {Object.entries(data.assessmentStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => (
            <View key={status} style={styles.distRow}>
              <Text style={styles.distLabel}>
                {translateOrRaw(translations, `statuses.${status}`, status)}
              </Text>
              <Text style={styles.distValue}>{count}</Text>
            </View>
          ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            translations("common.pageOf", {
              page: pageNumber,
              total: totalPages,
            })
          }
          fixed
        />
      </Page>

      {/* Vendor table (may span multiple pages) */}
      <Page size="A4" style={pageStyle}>
        <Text style={styles.sectionTitle}>
          {translations("portfolio.vendorsCount", { count: data.vendorCount })}
        </Text>
        <VendorsTable
          data={data}
          translations={translations}
          dateFormatter={dateFormatter}
        />

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            translations("common.pageOf", {
              page: pageNumber,
              total: totalPages,
            })
          }
          fixed
        />
      </Page>

      {/* Top deficient controls */}
      {data.topControls.length > 0 ? (
        <Page size="A4" style={pageStyle}>
          <Text style={styles.sectionTitle}>
            {translations("portfolio.topDeficientControls", {
              count: data.topControls.length,
            })}
          </Text>
          <View>
            <View style={styles.tableHeader}>
              <Text style={styles.colCode}>
                <Text style={styles.label}>
                  {translations("portfolio.control")}
                </Text>
              </Text>
              <Text style={styles.colControlTitle}>
                <Text style={styles.label}>
                  {translations("portfolio.title")}
                </Text>
              </Text>
              <Text style={styles.colControlCount}>
                <Text style={styles.label}>
                  {translations("portfolio.vendorsAffected")}
                </Text>
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
              translations("common.pageOf", {
                page: pageNumber,
                total: totalPages,
              })
            }
            fixed
          />
        </Page>
      ) : null}
    </Document>
  );
}

type PortfolioDashboardInput = {
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
  topDeficientControls: {
    code: string;
    title: string;
    vendorCount: number;
  }[];
};

export function buildPortfolioPdfData(
  dashboard: PortfolioDashboardInput,
  organizationName: string,
  generatedDate: string,
): PortfolioPdfData {
  return {
    organizationName,
    generatedDate,
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
      assessmentCount: vendor.assessmentCount,
    })),
    topControls: dashboard.topDeficientControls.map((control) => ({
      code: control.code,
      title: control.title,
      vendorCount: control.vendorCount,
    })),
  };
}

export async function generatePortfolioPdf(): Promise<Buffer> {
  const translations = await getTranslations("Pdf");
  const locale = await getLocale();
  const fontFamily = pdfFontFamily(locale);
  const direction = localeDirection(locale);
  registerPdfFonts();
  const formatter = await getFormatter();
  const translate: PdfTranslate = Object.assign(
    (key: string, values?: Record<string, string | number>) =>
      translations(key, values),
    { has: (key: string) => translations.has(key) },
  );
  const dateFormatter: PdfFormatter = {
    dateTime: (value, options) => formatter.dateTime(value, options),
  };
  const { getDashboardData } = await import("@/lib/db/compliance");
  const { getOrganizationSettings } = await import("@/lib/settings");

  const [dashboard, organization] = await Promise.all([
    getDashboardData(),
    getOrganizationSettings(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const data = buildPortfolioPdfData(dashboard, organization.name, today);

  return renderToBuffer(
    <PortfolioPdfDocument
      data={data}
      translations={translate}
      dateFormatter={dateFormatter}
      fontFamily={fontFamily}
      direction={direction}
    />,
  );
}
