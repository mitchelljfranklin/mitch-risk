-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Seed system roles
INSERT INTO "roles" ("id", "name", "description", "permissions", "isSystem", "createdAt", "updatedAt")
VALUES (
    'role_admin',
    'Admin',
    'Full access to every feature, including users, roles, and settings.',
    ARRAY[
        'dashboard:view',
        'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete',
        'assessments:view', 'assessments:create', 'assessments:edit', 'assessments:review', 'assessments:delete',
        'templates:view', 'templates:create', 'templates:edit', 'templates:delete',
        'frameworks:view', 'frameworks:edit',
        'audit:view', 'users:manage', 'roles:manage', 'settings:manage', 'api:manage'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
), (
    'role_reviewer',
    'Reviewer',
    'Can manage vendors, assessments, and templates and review responses. No access to users, roles, or settings.',
    ARRAY[
        'dashboard:view',
        'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete',
        'assessments:view', 'assessments:create', 'assessments:edit', 'assessments:review', 'assessments:delete',
        'templates:view', 'templates:create', 'templates:edit', 'templates:delete',
        'frameworks:view'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
), (
    'role_viewer',
    'Viewer',
    'Read-only access across the platform.',
    ARRAY[
        'dashboard:view',
        'vendors:view',
        'assessments:view',
        'templates:view',
        'frameworks:view'
    ],
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- AlterTable: add roleId (nullable for backfill)
ALTER TABLE "users" ADD COLUMN "roleId" TEXT;

-- Backfill existing users from the old enum column
UPDATE "users" SET "roleId" = 'role_admin' WHERE "role" = 'ADMIN';
UPDATE "users" SET "roleId" = 'role_reviewer' WHERE "role" = 'REVIEWER';
UPDATE "users" SET "roleId" = 'role_reviewer' WHERE "roleId" IS NULL;

-- Enforce NOT NULL now that data is backfilled
ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

-- Drop the old enum column and type
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "UserRole";

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
