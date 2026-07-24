import { CustomerResponsibilityChecklist } from "@/components/customer-responsibility-checklist";
import { listActionsByVendor } from "@/lib/db/customer-responsibility";
import { prisma } from "@/lib/prisma";

export type ResponsibilityAction = {
  id: string;
  frameworkName: string;
  controlCode: string;
  controlTitle: string;
  status: string;
  assignedToName: string | null;
  notes: string | null;
  completedAt: Date | null;
};

export type ResponsibilityCertGroup = {
  certificationName: string;
  certificationId: string | null;
  actions: ResponsibilityAction[];
};

export async function CustomerResponsibilityManager({
  vendorId,
  canEdit,
}: {
  vendorId: string;
  canEdit: boolean;
}) {
  const actions = await listActionsByVendor(vendorId);

  if (actions.length === 0) {
    return null;
  }

  const groupMap = new Map<string | null, ResponsibilityAction[]>();

  for (const action of actions) {
    const key = action.certificationId;
    const list = groupMap.get(key) ?? [];
    list.push({
      id: action.id,
      frameworkName: action.frameworkName,
      controlCode: action.controlCode,
      controlTitle: action.controlTitle,
      status: action.status,
      assignedToName: action.assignedToName,
      notes: action.notes,
      completedAt: action.completedAt,
    });
    groupMap.set(key, list);
  }

  const groups: ResponsibilityCertGroup[] = [];

  for (const [certId, certActions] of groupMap) {
    groups.push({
      certificationId: certId,
      certificationName: certActions[0]?.frameworkName ?? "",
      actions: certActions,
    });
  }

  const actionIds = actions.map((action) => action.id);
  const responsibilityAttachments = await prisma.attachment.findMany({
    where: {
      entityType: "CustomerResponsibilityAction",
      entityId: { in: actionIds },
    },
    orderBy: { createdAt: "asc" },
  });

  const attachmentMap = new Map<
    string,
    { id: string; fileName: string; displayName: string | null }[]
  >();
  for (const attachment of responsibilityAttachments) {
    const list = attachmentMap.get(attachment.entityId) ?? [];
    list.push({
      id: attachment.id,
      fileName: attachment.fileName,
      displayName: attachment.displayName,
    });
    attachmentMap.set(attachment.entityId, list);
  }

  return (
    <CustomerResponsibilityChecklist
      groups={groups}
      vendorId={vendorId}
      canEdit={canEdit}
      attachments={attachmentMap}
    />
  );
}
