-- CreateTable
CREATE TABLE "sso_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sso_identities_userId_idx" ON "sso_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_identities_provider_providerId_key" ON "sso_identities"("provider", "providerId");

-- AddForeignKey
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
