"use client";

import { Button } from "@/components/ui/button";
import { csvEscape } from "@/lib/utils";
import { Download } from "lucide-react";

type VendorExportRow = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  tier: string | null;
  website: string | null;
  notes: string | null;
  serviceDescription: string | null;
  dataSensitivity: string | null;
  contractRenewalDate: string | null;
};

const CSV_HEADER = [
  "id",
  "name",
  "contactname",
  "contactemail",
  "tier",
  "website",
  "notes",
  "servicedescription",
  "datasensitivity",
  "contractrenewaldate",
].join(",");

export function VendorExportButton({
  vendors,
}: {
  vendors: VendorExportRow[];
}) {
  function handleExport() {
    const rows = vendors.map((v) =>
      [
        csvEscape(v.id),
        csvEscape(v.name),
        csvEscape(v.contactName ?? ""),
        csvEscape(v.contactEmail),
        csvEscape(v.tier ?? ""),
        csvEscape(v.website ?? ""),
        csvEscape(v.notes ?? ""),
        csvEscape(v.serviceDescription ?? ""),
        csvEscape(v.dataSensitivity ?? ""),
        csvEscape(v.contractRenewalDate ?? ""),
      ].join(","),
    );
    const csv = [CSV_HEADER, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vendors-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-3.5" />
      Export CSV
    </Button>
  );
}
