import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { redirect } from "next/navigation";
import { cache } from "react";

import { logAudit } from "@/lib/db/audit";
import { verifyUserCredentials } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/schemas/auth";
import {
  type Permission,
  SYSTEM_ROLE_NAMES,
  hasPermission as permissionInList,
} from "@/lib/permissions";
import { getSsoSecret, getSsoSettings } from "@/lib/settings";

export const getRolePermissions = cache(
  async (roleId: string): Promise<{ name: string; permissions: string[] }> => {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, permissions: true },
    });
    return {
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    };
  },
);

async function resolveProvisionRoleId(): Promise<string | null> {
  const ssoSettings = await getSsoSettings();
  if (ssoSettings.autoProvisionRoleId) {
    const role = await prisma.role.findUnique({
      where: { id: ssoSettings.autoProvisionRoleId },
      select: { id: true },
    });
    if (role) {
      return role.id;
    }
  }

  const reviewer = await prisma.role.findUnique({
    where: { name: SYSTEM_ROLE_NAMES.REVIEWER },
    select: { id: true },
  });
  return reviewer?.id ?? null;
}

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
        roleId: "",
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
            roleId: user.roleId,
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
            token.roleId = localUser.roleId;
            await logAudit(localUser.id, "LOGIN");
          }
          return token;
        }

        if (user?.id) {
          token.id = user.id;
          token.roleId = user.roleId;
          await logAudit(user.id, "LOGIN");
        }

        return token;
      },

      session: async ({ session, token }) => {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }

        if (typeof token.roleId === "string" && token.roleId.length > 0) {
          const role = await getRolePermissions(token.roleId);
          session.user.roleId = token.roleId;
          session.user.roleName = role.name;
          session.user.permissions = role.permissions;
        } else {
          session.user.roleId = "";
          session.user.roleName = "";
          session.user.permissions = [];
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
): Promise<{ id: string; roleId: string } | null> {
  const existing = await prisma.ssoIdentity.findUnique({
    where: { provider_providerId: { provider, providerId: providerAccountId } },
    include: { user: true },
  });

  if (existing) {
    if (existing.user.disabled) {
      return null;
    }
    return { id: existing.user.id, roleId: existing.user.roleId };
  }

  let localUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!localUser) {
    const provisionRoleId = await resolveProvisionRoleId();
    if (!provisionRoleId) {
      return null;
    }
    localUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: "",
        roleId: provisionRoleId,
      },
    });
  }

  await prisma.ssoIdentity.create({
    data: { userId: localUser.id, provider, providerId: providerAccountId },
  });

  return { id: localUser.id, roleId: localUser.roleId };
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

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? permissionInList(user.permissions, permission) : false;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!permissionInList(user.permissions, permission)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const user = await requireUser();
  const allowed = permissions.some((permission) =>
    permissionInList(user.permissions, permission),
  );
  if (!allowed) {
    redirect("/dashboard");
  }
  return user;
}
