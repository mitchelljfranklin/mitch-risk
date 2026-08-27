import { type Prisma } from "../../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ResponsibilityTx = Prisma.TransactionClient;

export type CustomerResponsibilityActionView = {
  id: string;
  vendorId: string;
  certificationId: string | null;
  controlCode: string;
  frameworkName: string;
  controlTitle: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  notes: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

export function listActionsByVendor(
  vendorId: string,
): Promise<CustomerResponsibilityActionView[]> {
  return prisma.customerResponsibilityAction.findMany({
    where: { vendorId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      vendorId: true,
      certificationId: true,
      controlCode: true,
      frameworkName: true,
      controlTitle: true,
      status: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
      notes: true,
      completedAt: true,
      createdAt: true,
    },
  }) as unknown as Promise<CustomerResponsibilityActionView[]>;
}

export function matchFrameworkForCertification(
  certName: string,
): Promise<{ id: string; name: string } | null> {
  const trimmed = certName.trim();
  if (!trimmed) {
    return Promise.resolve(null);
  }

  const lower = trimmed.toLowerCase();
  const lowerNoSpace = lower.replace(/\s+/g, "");

  return prisma.framework
    .findFirst({
      where: {
        OR: [
          { name: { contains: certName.trim(), mode: "insensitive" } },
          {
            name: {
              startsWith: lower.split(" ")[0] ?? "",
              mode: "insensitive",
            },
          },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    .then((framework) => {
      if (!framework) return null;

      const frameworkLower = framework.name.toLowerCase();
      const frameworkLowerNoSpace = frameworkLower.replace(/\s+/g, "");

      if (
        lower.includes(frameworkLower) ||
        frameworkLower.includes(lower) ||
        lowerNoSpace.includes(frameworkLowerNoSpace)
      ) {
        return framework;
      }

      const certWords = lower.split(/[\s:-]+/);
      const frameworkWords = frameworkLower.split(/[\s:-]+/);
      const sharedWords = certWords.filter((word) =>
        frameworkWords.includes(word),
      );
      if (sharedWords.length > 0) {
        return framework;
      }

      return null;
    });
}

export function listSharedControlsForFramework(
  frameworkName: string,
): Promise<{ code: string; title: string }[]> {
  return prisma.control.findMany({
    where: {
      framework: { name: frameworkName },
      isSharedResponsibility: true,
    },
    orderBy: { order: "asc" },
    select: { code: true, title: true },
  });
}

export async function listCertificationsForVendor(
  vendorId: string,
): Promise<{ id: string; name: string }[]> {
  return prisma.vendorCertification.findMany({
    where: { vendorId },
    select: { id: true, name: true },
    orderBy: { expiresDate: "desc" },
  });
}

export type UpsertActionInput = {
  controlCode: string;
  frameworkName: string;
  controlTitle: string;
};

export async function applySharedResponsibilityActions(
  vendorId: string,
  certificationId: string,
  frameworkName: string | null | undefined,
  tx: ResponsibilityTx = prisma,
): Promise<void> {
  if (!frameworkName) {
    return;
  }

  const sharedControls = await listSharedControlsForFramework(frameworkName);
  if (sharedControls.length === 0) {
    return;
  }

  await upsertActionsForCertification(
    vendorId,
    certificationId,
    sharedControls.map((control) => ({
      controlCode: control.code,
      frameworkName,
      controlTitle: control.title,
    })),
    tx,
  );
}

export async function upsertActionsForCertification(
  vendorId: string,
  certificationId: string,
  actions: UpsertActionInput[],
  tx: ResponsibilityTx = prisma,
): Promise<number> {
  let created = 0;

  for (const action of actions) {
    await tx.customerResponsibilityAction.upsert({
      where: {
        vendorId_certificationId_controlCode: {
          vendorId,
          certificationId,
          controlCode: action.controlCode,
        },
      },
      update: {
        frameworkName: action.frameworkName,
        controlTitle: action.controlTitle,
      },
      create: {
        vendorId,
        certificationId,
        controlCode: action.controlCode,
        frameworkName: action.frameworkName,
        controlTitle: action.controlTitle,
        status: "PENDING",
      },
    });
    created++;
  }

  return created;
}

export type UpdateActionInput = {
  status?: string;
  assignedToId?: string | null;
  notes?: string | null;
  completedAt?: Date | null;
};

export async function updateAction(
  actionId: string,
  data: UpdateActionInput,
): Promise<void> {
  await prisma.customerResponsibilityAction.update({
    where: { id: actionId },
    data: data as Parameters<
      typeof prisma.customerResponsibilityAction.update
    >[0]["data"],
  });
}

export type CustomerResponsibilityCompliance = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  notApplicable: number;
  percent: number;
};

export async function getCustomerResponsibilityCompliance(
  vendorId: string,
): Promise<CustomerResponsibilityCompliance | null> {
  const actions = await prisma.customerResponsibilityAction.findMany({
    where: { vendorId },
    select: { status: true },
  });

  if (actions.length === 0) {
    return null;
  }

  const counts = {
    total: actions.length,
    completed: 0,
    inProgress: 0,
    pending: 0,
    notApplicable: 0,
  };

  for (const action of actions) {
    switch (action.status) {
      case "COMPLETED":
        counts.completed++;
        break;
      case "IN_PROGRESS":
        counts.inProgress++;
        break;
      case "PENDING":
        counts.pending++;
        break;
      case "NOT_APPLICABLE":
        counts.notApplicable++;
        break;
    }
  }

  const effectiveCompleted = counts.completed + counts.notApplicable;

  return {
    ...counts,
    percent:
      counts.total > 0
        ? Math.round((effectiveCompleted / counts.total) * 100)
        : 0,
  };
}

export type PortfolioResponsibilitySummary = {
  totalVendors: number;
  totalActions: number;
  completedActions: number;
  percent: number;
};

export async function getPortfolioResponsibilitySummary(): Promise<PortfolioResponsibilitySummary | null> {
  const actions = await prisma.customerResponsibilityAction.findMany({
    select: { vendorId: true, status: true },
  });

  if (actions.length === 0) {
    return null;
  }

  const vendorIds = new Set<string>();
  let completed = 0;

  for (const action of actions) {
    vendorIds.add(action.vendorId);
    if (action.status === "COMPLETED" || action.status === "NOT_APPLICABLE") {
      completed++;
    }
  }

  return {
    totalVendors: vendorIds.size,
    totalActions: actions.length,
    completedActions: completed,
    percent: Math.round((completed / actions.length) * 100),
  };
}

export type ResponsibilityActionWithVendor = {
  id: string;
  vendorId: string;
  vendorName: string;
  controlCode: string;
  controlTitle: string;
  status: string;
  assignedToName: string | null;
  createdAt: Date;
};

export async function listAllResponsibilityActions(
  vendorId?: string,
  status?: string,
): Promise<ResponsibilityActionWithVendor[]> {
  return prisma.customerResponsibilityAction.findMany({
    where: {
      ...(vendorId ? { vendorId } : {}),
      ...(status
        ? {
            status: status as
              "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE",
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      vendorId: true,
      vendor: { select: { name: true } },
      controlCode: true,
      controlTitle: true,
      status: true,
      assignedTo: { select: { name: true } },
      createdAt: true,
    },
  }) as unknown as Promise<ResponsibilityActionWithVendor[]>;
}
