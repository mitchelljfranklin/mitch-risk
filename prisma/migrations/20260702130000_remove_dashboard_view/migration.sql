-- Drop the redundant dashboard:view permission from all roles.
-- The dashboard is now the universal landing for any authenticated user.
UPDATE "roles" SET "permissions" = array_remove("permissions", 'dashboard:view');
