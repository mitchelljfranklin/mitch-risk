import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/db/audit";
import { verifyUserCredentials } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/schemas/auth";
import { getSsoSecret, getSsoSettings } from "@/lib/settings";

async function buildSsoProviders(): Promise<Provider[]> {
  const ssoSettings = await getSsoSettings();
  const providers: Provider[] = [];

  if (ssoSettings.entraIdEnabled && ssoSettings.entraIdClientId) {
    const secret = await getSsoSecret("entraId");
    providers.push(
      MicrosoftEntraId({
        clientId: ssoSettings.entraIdClientId,
        clientSecret: secret ?? "",
      }),
    );
  }

  if (ssoSettings.googleEnabled && ssoSettings.googleClientId) {
    const secret = await getSsoSecret("google");
    providers.push(
      Google({
        clientId: ssoSettings.googleClientId,
        clientSecret: secret ?? "",
      }),
    );
  }

  if (
    ssoSettings.oidcEnabled &&
    ssoSettings.oidcClientId &&
    ssoSettings.oidcIssuer
  ) {
    const secret = await getSsoSecret("oidc");
    providers.push({
      id: "oidc",
      name: ssoSettings.oidcName || "SSO",
      type: "oidc",
      issuer: ssoSettings.oidcIssuer,
      clientId: ssoSettings.oidcClientId,
      clientSecret: secret ?? "",
      profile: (profile: Record<string, unknown>) => ({
        id: String(profile.sub ?? ""),
        name: String(profile.name ?? profile.preferred_username ?? ""),
        email: String(profile.email ?? ""),
        image: null,
        role: UserRole.REVIEWER,
      }),
    });
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const ssoProviders = await buildSsoProviders();

  return {
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (rawCredentials) => {
          const parsed = credentialsSchema.safeParse(rawCredentials);
          if (!parsed.success) {
            return null;
          }

          const user = await verifyUserCredentials(
            parsed.data.email,
            parsed.data.password,
          );
          if (!user || user.disabled) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        },
      }),
      ...ssoProviders,
    ],
    callbacks: {
      signIn: async ({ account, profile }) => {
        if (!account || account.provider === "credentials") {
          return true;
        }

        const ssoSettings = await getSsoSettings();

        if (ssoSettings.allowedDomain && profile?.email) {
          const domain = profile.email.split("@")[1]?.toLowerCase();
          if (domain !== ssoSettings.allowedDomain.toLowerCase()) {
            return false;
          }
        }

        return true;
      },

      jwt: async ({ token, user, account }) => {
        if (account && account.provider !== "credentials") {
          const localUser = await resolveSsoUser(
            account.provider,
            account.providerAccountId,
            user.email ?? "",
            user.name ?? user.email ?? "",
          );

          if (localUser) {
            token.id = localUser.id;
            token.role = localUser.role;
            await logAudit(localUser.id, "LOGIN");
          }
          return token;
        }

        if (user?.id) {
          token.id = user.id;
          token.role = user.role;
          await logAudit(user.id, "LOGIN");
        }

        return token;
      },

      session: ({ session, token }) => {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
        const { role } = token;
        if (role === UserRole.ADMIN || role === UserRole.REVIEWER) {
          session.user.role = role;
        }
        return session;
      },
    },
  };
});

async function resolveSsoUser(
  provider: string,
  providerAccountId: string,
  email: string,
  name: string,
): Promise<{ id: string; role: UserRole } | null> {
  const existing = await prisma.ssoIdentity.findUnique({
    where: { provider_providerId: { provider, providerId: providerAccountId } },
    include: { user: true },
  });

  if (existing) {
    if (existing.user.disabled) {
      return null;
    }
    return { id: existing.user.id, role: existing.user.role };
  }

  const ssoSettings = await getSsoSettings();
  let localUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!localUser) {
    localUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: "",
        role: ssoSettings.autoProvisionRole as UserRole,
      },
    });
  }

  await prisma.ssoIdentity.create({
    data: { userId: localUser.id, provider, providerId: providerAccountId },
  });

  return { id: localUser.id, role: localUser.role };
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }
  return user;
}
