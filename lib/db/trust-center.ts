import { type Prisma } from "../../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import type {
  TrustCenterBadgeInput,
  TrustCenterDocumentInput,
  TrustCenterSectionInput,
  TrustCenterSubprocessorInput,
} from "@/lib/schemas/trust-center";

const DOCUMENT_ENTITY_TYPE = "TrustCenterDocument";

// Minimal delegate shape shared by all four trust-center models for
// reorder/next-position logic. Callers cast their concrete delegate to this.
type SortOrderDelegate = {
  findMany(args: {
    orderBy: Record<string, "asc" | "desc">[];
    select: { id: true; sortOrder: true };
    take?: number;
  }): Promise<{ id: string; sortOrder: number }[]>;
  update(args: {
    where: { id: string };
    data: { sortOrder: number };
  }): Prisma.PrismaPromise<unknown>;
};

export type TrustCenterMoveDirection = "up" | "down";

// Swaps the item's position with its ordered neighbour. Ties (e.g. legacy
// all-zero sortOrder) are normalised to sequential positions first, and the
// full sequence is persisted — writing only the swapped pair would leave
// other tied rows sharing a position and break the display order.
async function moveTrustCenterItem(
  delegate: SortOrderDelegate,
  id: string,
  direction: TrustCenterMoveDirection,
): Promise<void> {
  const items = await delegate.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return;

  // Desired order: display order with the two neighbours swapped, then
  // persist array position as the new sortOrder for every row.
  const desired = [...items];
  [desired[index], desired[targetIndex]] = [
    desired[targetIndex]!,
    desired[index]!,
  ];

  const updates = desired.map((item, position) =>
    delegate.update({
      where: { id: item.id },
      data: { sortOrder: position },
    }),
  );
  await prisma.$transaction(updates);
}

// New items land at the bottom of their list.
async function nextSortOrder(delegate: SortOrderDelegate): Promise<number> {
  const rows = await delegate.findMany({
    orderBy: [{ sortOrder: "desc" }],
    select: { id: true, sortOrder: true },
    take: 1,
  });
  return rows.length > 0 ? rows[0]!.sortOrder + 1 : 0;
}

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

export async function createTrustBadge(input: TrustCenterBadgeInput) {
  const badgeDelegate = prisma.trustCenterBadge as unknown as SortOrderDelegate;
  const sortOrder = await nextSortOrder(badgeDelegate);
  return prisma.trustCenterBadge.create({
    data: { ...badgeData(input), sortOrder },
  });
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

export async function moveTrustBadge(
  id: string,
  direction: TrustCenterMoveDirection,
): Promise<void> {
  await moveTrustCenterItem(
    prisma.trustCenterBadge as unknown as SortOrderDelegate,
    id,
    direction,
  );
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
  return buildDocumentViews(false);
}

export async function listPublishedTrustCenterDocuments(): Promise<
  TrustCenterDocumentView[]
> {
  return buildDocumentViews(true);
}

async function buildDocumentViews(
  publishedOnly: boolean,
): Promise<TrustCenterDocumentView[]> {
  const [documents, attachments] = await Promise.all([
    prisma.trustCenterDocument.findMany({
      where: publishedOnly ? { published: true } : undefined,
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

export async function createTrustDocument(input: TrustCenterDocumentInput) {
  const documentDelegate =
    prisma.trustCenterDocument as unknown as SortOrderDelegate;
  const sortOrder = await nextSortOrder(documentDelegate);
  return prisma.trustCenterDocument.create({
    data: { ...documentData(input), sortOrder },
  });
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

export async function moveTrustDocument(
  id: string,
  direction: TrustCenterMoveDirection,
): Promise<void> {
  await moveTrustCenterItem(
    prisma.trustCenterDocument as unknown as SortOrderDelegate,
    id,
    direction,
  );
}

// --- subprocessors ---

export function listTrustCenterSubprocessors() {
  return prisma.trustCenterSubprocessor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getTrustSubprocessor(id: string) {
  return prisma.trustCenterSubprocessor.findUnique({ where: { id } });
}

export function setTrustSubprocessorLogo(id: string, logoKey: string) {
  return prisma.trustCenterSubprocessor.update({
    where: { id },
    data: { logoKey },
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

export async function createTrustSubprocessor(
  input: TrustCenterSubprocessorInput,
) {
  const subprocessorDelegate =
    prisma.trustCenterSubprocessor as unknown as SortOrderDelegate;
  const sortOrder = await nextSortOrder(subprocessorDelegate);
  return prisma.trustCenterSubprocessor.create({
    data: { ...subprocessorData(input), sortOrder },
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

export async function deleteTrustSubprocessor(id: string): Promise<void> {
  const subprocessor = await prisma.trustCenterSubprocessor.findUnique({
    where: { id },
  });
  if (subprocessor?.logoKey) {
    await storage.delete(subprocessor.logoKey).catch(() => {
      // Best-effort; the orphan sweep is the backstop.
    });
  }
  await prisma.trustCenterSubprocessor.delete({ where: { id } });
}

export async function moveTrustSubprocessor(
  id: string,
  direction: TrustCenterMoveDirection,
): Promise<void> {
  await moveTrustCenterItem(
    prisma.trustCenterSubprocessor as unknown as SortOrderDelegate,
    id,
    direction,
  );
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

export async function createTrustSection(input: TrustCenterSectionInput) {
  const sectionDelegate =
    prisma.trustCenterSection as unknown as SortOrderDelegate;
  const sortOrder = await nextSortOrder(sectionDelegate);
  return prisma.trustCenterSection.create({
    data: { ...sectionData(input), sortOrder },
  });
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

export async function moveTrustSection(
  id: string,
  direction: TrustCenterMoveDirection,
): Promise<void> {
  await moveTrustCenterItem(
    prisma.trustCenterSection as unknown as SortOrderDelegate,
    id,
    direction,
  );
}

// --- published-only reads (public trust center page + file routes) ---

// Expiry classification happens here (not in the page render) so the
// time source stays out of React-purity scope.
export type PublishedTrustCenterBadge = {
  id: string;
  title: string;
  issuer: string;
  description: string;
  imageKey: string;
  externalUrl: string;
  expiresDate: Date | null;
  expired: boolean;
  expiringSoon: boolean;
};

export async function listPublishedTrustCenterBadges(): Promise<
  PublishedTrustCenterBadge[]
> {
  const rows = await prisma.trustCenterBadge.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const now = Date.now();
  const thirtyDaysMs = 30 * 86_400_000;
  return rows.map((badge) => ({
    id: badge.id,
    title: badge.title,
    issuer: badge.issuer,
    description: badge.description,
    imageKey: badge.imageKey,
    externalUrl: badge.externalUrl,
    expiresDate: badge.expiresDate,
    expired: badge.expiresDate !== null && badge.expiresDate.getTime() < now,
    expiringSoon:
      badge.expiresDate !== null &&
      badge.expiresDate.getTime() >= now &&
      badge.expiresDate.getTime() < now + thirtyDaysMs,
  }));
}

export function listPublishedTrustCenterSubprocessors() {
  return prisma.trustCenterSubprocessor.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function listPublishedTrustCenterSections() {
  return prisma.trustCenterSection.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// Returns the storage key only when the subprocessor is published AND has a
// stored logo.
export function getPublishedTrustCenterSubprocessorLogo(id: string) {
  return prisma.trustCenterSubprocessor.findFirst({
    where: { id, published: true, logoKey: { not: "" } },
    select: { logoKey: true },
  });
}

// Returns the document + its stored file only when the document is
// published; unpublished or file-less documents 404 at the caller.
export async function getPublishedTrustCenterDocument(id: string) {
  const document = await prisma.trustCenterDocument.findFirst({
    where: { id, published: true },
  });
  if (!document) return null;
  const attachment = await prisma.attachment.findFirst({
    where: { entityType: DOCUMENT_ENTITY_TYPE, entityId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!attachment) return null;
  return { document, attachment };
}

// Returns the storage key only when the badge is published AND has an image.
export function getPublishedTrustCenterBadgeImage(id: string) {
  return prisma.trustCenterBadge.findFirst({
    where: { id, published: true, imageKey: { not: "" } },
    select: { imageKey: true },
  });
}
