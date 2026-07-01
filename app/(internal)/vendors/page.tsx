import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireUser } from "@/lib/auth";
import { listVendors } from "@/lib/db/vendors";
import { VENDOR_TIER_LABELS } from "@/lib/schemas/vendor";
import { ImportVendorsForm } from "./import-vendors-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vendors" };

type VendorsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  await requireUser();
  const sp = await searchParams;
  const vendors = await listVendors({
    query: sp.query,
    tier: sp.tier || undefined,
  });
  const hasFilters = Boolean(sp.query) || Boolean(sp.tier);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground text-sm">
            Vendors you assess for security risk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportVendorsForm />
          <Button asChild variant="outline">
            <Link href="/vendors/bulk-send">Bulk send</Link>
          </Button>
          <Button asChild>
            <Link href="/vendors/new">New vendor</Link>
          </Button>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="query">
            Search
          </label>
          <Input
            id="query"
            name="query"
            placeholder="Name or email…"
            defaultValue={sp.query ?? ""}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs" htmlFor="tier">
            Tier
          </label>
          <Select name="tier" defaultValue={sp.tier ?? ""}>
            <SelectTrigger id="tier" className="w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VENDOR_TIER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="secondary" size="sm" className="mb-px">
          Filter
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm" className="mb-px">
            <Link href="/vendors">Clear</Link>
          </Button>
        ) : null}
      </form>

      {vendors.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {hasFilters
            ? "No vendors match the selected filters."
            : "No vendors yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{vendor.name}</CardTitle>
                    {vendor.tier ? (
                      <Badge variant="outline">
                        {VENDOR_TIER_LABELS[vendor.tier]}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>{vendor.contactEmail}</CardDescription>
                  <p className="text-muted-foreground text-sm">
                    {vendor._count.assessments} assessments
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
