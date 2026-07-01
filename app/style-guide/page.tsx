import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatDate, formatPercent } from "@/lib/utils";

export const metadata = {
  title: "Style guide",
};

export default function StyleGuidePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Style guide</h1>
          <p className="text-muted-foreground text-sm">
            Design-token reference for shared shadcn/ui primitives (light &amp;
            dark).
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Variants extend one primitive via tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges &amp; formatters</CardTitle>
          <CardDescription>Shared helpers from lib/utils.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge>Compliant</Badge>
          <Badge variant="secondary">Pending</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="destructive">Finding</Badge>
          <span className="text-muted-foreground text-sm">
            Score {formatPercent(0.732)} · Due {formatDate(new Date())}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form controls</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-sm gap-2">
          <Label htmlFor="example">Vendor name</Label>
          <Input id="example" placeholder="Acme Logistics" />
        </CardContent>
      </Card>
    </main>
  );
}
