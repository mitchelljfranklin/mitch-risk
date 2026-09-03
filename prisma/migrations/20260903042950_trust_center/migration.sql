-- CreateEnum
CREATE TYPE "TrustCenterDocumentCategory" AS ENUM ('POLICY', 'SECURITY', 'COMPLIANCE', 'PRIVACY', 'OTHER');

-- CreateTable
CREATE TABLE "trust_center_badges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageKey" TEXT NOT NULL DEFAULT '',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "issuedDate" TIMESTAMP(3),
    "expiresDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_center_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_center_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "TrustCenterDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_center_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_center_subprocessors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "websiteUrl" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_center_subprocessors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_center_sections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_center_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trust_center_badges_published_sortOrder_idx" ON "trust_center_badges"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "trust_center_documents_published_sortOrder_idx" ON "trust_center_documents"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "trust_center_subprocessors_published_sortOrder_idx" ON "trust_center_subprocessors"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "trust_center_sections_published_sortOrder_idx" ON "trust_center_sections"("published", "sortOrder");
