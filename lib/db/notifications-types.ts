export type EmailLogFilters = {
  status?: string;
  type?: string;
  recipient?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type EmailLogResult = {
  entries: EmailLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type EmailLogEntry = {
  id: string;
  type: string;
  sentTo: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  sentAt: Date;
  assessmentId: string | null;
  assessmentTitle: string | null;
  sentBy: { name: string } | null;
};

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  INVITE: "Invite",
  REMINDER: "Reminder",
  ESCALATION: "Escalation",
  EXPIRY: "Expiry",
  TEST: "Test",
};
