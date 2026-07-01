import { getAppearanceSettings } from "@/lib/settings";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const appearance = await getAppearanceSettings();

  return (
    <div className="grid min-h-svh place-items-center p-4">
      <div className="w-full max-w-sm">
        {appearance.logoKey ? (
          <div className="mb-8 flex justify-center">
            <img
              src="/api/brand/logo"
              alt="Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
