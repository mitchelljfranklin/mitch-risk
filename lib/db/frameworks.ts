import { type Control, type Framework, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type FrameworkWithCount = Framework & {
  _count: { controls: number };
};

export function listFrameworks(): Promise<FrameworkWithCount[]> {
  return prisma.framework.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { controls: true } } },
  });
}

export function getFramework(frameworkId: string): Promise<Framework | null> {
  return prisma.framework.findUnique({ where: { id: frameworkId } });
}

export function createFramework(
  input: Pick<Framework, "name" | "version" | "description">,
): Promise<Framework> {
  return prisma.framework.create({ data: input });
}

export function createControls(
  controls: Omit<Control, "id" | "createdAt" | "updatedAt">[],
): Promise<Prisma.BatchPayload> {
  return prisma.control.createMany({ data: controls });
}

export function listControls(
  frameworkId: string,
  search?: string,
): Promise<Control[]> {
  const trimmed = search?.trim();

  return prisma.control.findMany({
    where: {
      frameworkId,
      ...(trimmed
        ? {
            OR: [
              { code: { contains: trimmed, mode: "insensitive" } },
              { title: { contains: trimmed, mode: "insensitive" } },
              { domain: { contains: trimmed, mode: "insensitive" } },
              { guidance: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { order: "asc" },
  });
}

export async function listControlOptions(): Promise<
  { id: string; code: string; title: string; frameworkName: string }[]
> {
  const controls = await prisma.control.findMany({
    include: { framework: { select: { name: true, version: true } } },
    orderBy: [{ framework: { name: "asc" } }, { order: "asc" }],
  });

  return controls.map((control) => ({
    id: control.id,
    code: control.code,
    title: control.title,
    frameworkName: `${control.framework.name} ${control.framework.version}`,
  }));
}

export type ControlWithFramework = Control & { framework: Framework };

export function getControl(
  controlId: string,
): Promise<ControlWithFramework | null> {
  return prisma.control.findUnique({
    where: { id: controlId },
    include: { framework: true },
  });
}
