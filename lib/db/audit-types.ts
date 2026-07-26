import type { Prisma } from "../../prisma/generated/prisma/client";

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type AuditLogResult = {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
  user: { id: string; name: string };
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  CREATE_ASSESSMENT: "Created assessment",
  DELETE_ASSESSMENT: "Deleted assessment",
  SEND_ASSESSMENT: "Sent assessment",
  REVOKE_ASSESSMENT: "Revoked assessment link",
  EXTEND_ASSESSMENT: "Extended assessment link",
  REGENERATE_ASSESSMENT: "Regenerated assessment link",
  SUBMIT_ASSESSMENT: "Submitted assessment",
  REVIEW_DECISION: "Review decision",
  SEND_BACK_TO_VENDOR: "Sent back to vendor",
  REOPEN_REVIEW: "Reopened review",
  UPDATE_FINDING: "Updated finding",
  ADD_COMMENT: "Added comment",
  REOPEN_ASSESSMENT: "Reopened assessment",
  FINALIZE_ASSESSMENT: "Finalized assessment",
  CREATE_VENDOR: "Created vendor",
  UPDATE_VENDOR: "Updated vendor",
  DELETE_VENDOR: "Deleted vendor",
  IMPORT_VENDOR: "Imported vendor",
  CREATE_TEMPLATE: "Created template",
  UPDATE_TEMPLATE: "Updated template",
  DELETE_TEMPLATE: "Deleted template",
  PUBLISH_TEMPLATE: "Published template",
  UNPUBLISH_TEMPLATE: "Unpublished template",
  CREATE_TEMPLATE_VERSION: "Created template version",
  DUPLICATE_TEMPLATE: "Duplicated template",
  IMPORT_TEMPLATE: "Imported template",
  CREATE_USER: "Created user",
  DELETE_USER: "Deleted user",
  DISABLE_USER: "Disabled user",
  ENABLE_USER: "Enabled user",
  CHANGE_ROLE: "Changed role",
  CREATE_ROLE: "Created role",
  UPDATE_ROLE: "Updated role",
  UPDATE_PROFILE: "Updated profile",
  DELETE_ROLE: "Deleted role",
  DUPLICATE_ROLE: "Duplicated role",
  RESET_PASSWORD: "Reset password",
  UPDATE_SETTINGS: "Updated settings",
  API_KEY_CREATED: "Created API key",
  API_KEY_REVOKED: "Revoked API key",
  API_KEY_ENABLED: "Enabled API key",
  API_KEY_DELETED: "Deleted API key",
  CREATE_CERTIFICATION: "Added certification",
  UPDATE_CERTIFICATION: "Updated certification",
  DELETE_CERTIFICATION: "Deleted certification",
  CREATE_FRAMEWORK: "Imported framework",
  UPDATE_RESPONSIBILITY_ACTION: "Updated responsibility action",
  MARK_CONTROL_SHARED: "Marked control as shared responsibility",
  UNMARK_CONTROL_SHARED: "Unmarked control as shared responsibility",
};
