import { prisma } from "@/lib/prisma";

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
  const lower = certName.toLowerCase();

  return prisma.framework
    .findFirst({
      where: {
        OR: [
          { name: { contains: certName, mode: "insensitive" } },
          { name: { startsWith: lower.split(" ")[0] ?? "", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    .then((framework) => {
      if (!framework) return null;

      const frameworkLower = framework.name.toLowerCase();
      if (
        lower.includes(frameworkLower) ||
        frameworkLower.includes(lower)
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

export async function upsertActionsForCertification(
  vendorId: string,
  certificationId: string,
  actions: UpsertActionInput[],
): Promise<number> {
  let created = 0;

  for (const action of actions) {
    await prisma.customerResponsibilityAction.upsert({
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
