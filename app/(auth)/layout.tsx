import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [appearance, organization] = await Promise.all([
    getAppearanceSettings(),
    getOrganizationSettings(),
  ]);

  return (
    <div className="relative grid min-h-svh place-items-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="from-primary/5 via-background to-primary/10 absolute inset-0 bg-gradient-to-br" />
        <div className="bg-primary/5 absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/3 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm" id="main-content">
        {appearance.logoKey ? (
          <div className="mb-8 flex flex-col items-center gap-3">
            <img
              src={`/api/brand/logo?v=${appearance.logoKey}`}
              alt={organization.name}
              width={96}
              height={56}
              loading="lazy"
              className="h-14 w-auto object-contain"
            />
            <h1 className="text-muted-foreground text-sm font-medium">
              {organization.name}
            </h1>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {organization.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vendor risk management
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
