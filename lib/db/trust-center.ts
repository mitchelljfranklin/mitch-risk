import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import type {
  TrustCenterBadgeInput,
  TrustCenterDocumentInput,
  TrustCenterSectionInput,
  TrustCenterSubprocessorInput,
} from "@/lib/schemas/trust-center";

const DOCUMENT_ENTITY_TYPE = "TrustCenterDocument";

function toDate(value: string): Date | null {
  return value ? new Date(value) : null;
}

// --- badges ---

export function listTrustCenterBadges() {
  return prisma.trustCenterBadge.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function getTrustBadge(id: string) {
  return prisma.trustCenterBadge.findUnique({ where: { id } });
}

export function setTrustBadgeImage(id: string, imageKey: string) {
  return prisma.trustCenterBadge.update({
    where: { id },
    data: { imageKey },
  });
}

function badgeData(input: TrustCenterBadgeInput) {
  return {
    title: input.title,
    issuer: input.issuer,
    description: input.description,
    externalUrl: input.externalUrl,
    issuedDate: toDate(input.issuedDate),
    expiresDate: toDate(input.expiresDate),
    published: input.published,
  };
}

export function createTrustBadge(input: TrustCenterBadgeInput) {
  return prisma.trustCenterBadge.create({ data: badgeData(input) });
}

export function updateTrustBadge(id: string, input: TrustCenterBadgeInput) {
  return prisma.trustCenterBadge.update({
    where: { id },
    data: badgeData(input),
  });
}

export async function deleteTrustBadge(id: string): Promise<void> {
  const badge = await prisma.trustCenterBadge.findUnique({ where: { id } });
  if (!badge) return;
  if (badge.imageKey) {
    // Best-effort; the orphan sweep is the backstop.
    await storage.delete(badge.imageKey).catch(() => {
      // file already gone
    });
  }
  await prisma.trustCenterBadge.delete({ where: { id } });
}

// --- documents ---

export type TrustCenterDocumentView = {
  id: string;
  title: string;
  description: string;
  category: string;
  sortOrder: number;
  published: boolean;
  file: {
    attachmentId: string;
    fileName: string;
    sizeBytes: number;
  } | null;
};

export async function listTrustCenterDocuments(): Promise<
  TrustCenterDocumentView[]
> {
  const [documents, attachments] = await Promise.all([
    prisma.trustCenterDocument.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.attachment.findMany({
      where: { entityType: DOCUMENT_ENTITY_TYPE },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const fileByDocumentId = new Map<string, (typeof attachments)[number]>();
  for (const attachment of attachments) {
    // One file per document: the latest upload wins.
    fileByDocumentId.set(attachment.entityId, attachment);
  }

  return documents.map((document) => {
    const file = fileByDocumentId.get(document.id);
    return {
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category,
      sortOrder: document.sortOrder,
      published: document.published,
      file: file
        ? {
            attachmentId: file.id,
            fileName: file.fileName,
            sizeBytes: file.sizeBytes,
          }
        : null,
    };
  });
}

function documentData(input: TrustCenterDocumentInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    published: input.published,
  };
}

export function createTrustDocument(input: TrustCenterDocumentInput) {
  return prisma.trustCenterDocument.create({ data: documentData(input) });
}

export function updateTrustDocument(
  id: string,
  input: TrustCenterDocumentInput,
) {
  return prisma.trustCenterDocument.update({
    where: { id },
    data: documentData(input),
  });
}

export async function deleteTrustDocument(id: string): Promise<void> {
  const attachments = await prisma.attachment.findMany({
    where: { entityType: DOCUMENT_ENTITY_TYPE, entityId: id },
  });
  for (const attachment of attachments) {
    await storage.delete(attachment.storageKey).catch(() => {
      // Best-effort; the orphan sweep is the backstop.
    });
  }
  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { entityType: DOCUMENT_ENTITY_TYPE, entityId: id },
    }),
    prisma.trustCenterDocument.delete({ where: { id } }),
  ]);
}

// Replaces the document's stored file: old file deleted, new attachment row
// replaces the previous one. Caller has already saved the new file to
// storage and rolls back `newKey` if the row write fails.
export async function replaceTrustDocumentFile(
  documentId: string,
  file: {
    fileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<void> {
  const previous = await prisma.attachment.findFirst({
    where: { entityType: DOCUMENT_ENTITY_TYPE, entityId: documentId },
    orderBy: { createdAt: "desc" },
  });

  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { entityType: DOCUMENT_ENTITY_TYPE, entityId: documentId },
    }),
    prisma.attachment.create({
      data: {
        entityType: DOCUMENT_ENTITY_TYPE,
        entityId: documentId,
        fileName: file.fileName,
        storageKey: file.storageKey,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      },
    }),
  ]);

  if (previous) {
    await storage.delete(previous.storageKey).catch(() => {
      // Best-effort; the orphan sweep is the backstop.
    });
  }
}

// --- subprocessors ---

export function listTrustCenterSubprocessors() {
  return prisma.trustCenterSubprocessor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

function subprocessorData(input: TrustCenterSubprocessorInput) {
  return {
    name: input.name,
    purpose: input.purpose,
    location: input.location,
    websiteUrl: input.websiteUrl,
    published: input.published,
  };
}

export function createTrustSubprocessor(input: TrustCenterSubprocessorInput) {
  return prisma.trustCenterSubprocessor.create({
    data: subprocessorData(input),
  });
}

export function updateTrustSubprocessor(
  id: string,
  input: TrustCenterSubprocessorInput,
) {
  return prisma.trustCenterSubprocessor.update({
    where: { id },
    data: subprocessorData(input),
  });
}

export function deleteTrustSubprocessor(id: string) {
  return prisma.trustCenterSubprocessor.delete({ where: { id } });
}

// --- sections ---

export function listTrustCenterSections() {
  return prisma.trustCenterSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

function sectionData(input: TrustCenterSectionInput) {
  return {
    title: input.title,
    body: input.body,
    published: input.published,
  };
}

export function createTrustSection(input: TrustCenterSectionInput) {
  return prisma.trustCenterSection.create({ data: sectionData(input) });
}

export function updateTrustSection(id: string, input: TrustCenterSectionInput) {
  return prisma.trustCenterSection.update({
    where: { id },
    data: sectionData(input),
  });
}

export function deleteTrustSection(id: string) {
  return prisma.trustCenterSection.delete({ where: { id } });
}
