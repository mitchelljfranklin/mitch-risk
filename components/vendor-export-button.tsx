"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { csvEscape } from "@/lib/utils";
import { Download } from "lucide-react";

type VendorExportRow = {
  id: string;
  name: string;
  externalId: string | null;
  contactName: string | null;
  contactEmail: string;
  tier: string | null;
  website: string | null;
  notes: string | null;
  serviceDescription: string | null;
  dataSensitivity: string | null;
  contractRenewalDate: string | null;
  contractValue: string | null;
  geographicRisk: string | null;
  tags: string[];
};

const CSV_HEADER = [
  "id",
  "name",
  "externalid",
  "contactname",
  "contactemail",
  "tier",
  "website",
  "notes",
  "servicedescription",
  "datasensitivity",
  "contractrenewaldate",
  "contractvalue",
  "geographicrisk",
  "tags",
].join(",");

function buildCsv(vendors: VendorExportRow[]): string {
  const rows = vendors.map((vendor) =>
    [
      csvEscape(vendor.id),
      csvEscape(vendor.name),
      csvEscape(vendor.externalId ?? ""),
      csvEscape(vendor.contactName ?? ""),
      csvEscape(vendor.contactEmail),
      csvEscape(vendor.tier ?? ""),
      csvEscape(vendor.website ?? ""),
      csvEscape(vendor.notes ?? ""),
      csvEscape(vendor.serviceDescription ?? ""),
      csvEscape(vendor.dataSensitivity ?? ""),
      csvEscape(vendor.contractRenewalDate ?? ""),
      csvEscape(vendor.contractValue ?? ""),
      csvEscape(vendor.geographicRisk ?? ""),
      csvEscape(vendor.tags?.length ? vendor.tags.join(", ") : ""),
    ].join(","),
  );
  return [CSV_HEADER, ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VendorExportButton({
  allVendors,
  currentVendors,
}: {
  allVendors: VendorExportRow[];
  currentVendors: VendorExportRow[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() =>
            downloadCsv(buildCsv(allVendors), "vendors-export.csv")
          }
        >
          All vendors
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadCsv(buildCsv(currentVendors), "vendors-export-page.csv")
          }
        >
          Current page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
