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

  const actionsByCertification = new Map<
    string | null,
    ResponsibilityAction[]
  >();

  for (const action of actions) {
    const certificationId = action.certificationId;
    const certificationActions =
      actionsByCertification.get(certificationId) ?? [];
    certificationActions.push({
      id: action.id,
      frameworkName: action.frameworkName,
      controlCode: action.controlCode,
      controlTitle: action.controlTitle,
      status: action.status,
      assignedToName: action.assignedToName,
      notes: action.notes,
      completedAt: action.completedAt,
    });
    actionsByCertification.set(certificationId, certificationActions);
  }

  const groups: ResponsibilityCertGroup[] = [];

  for (const [
    certificationId,
    actionsForCertification,
  ] of actionsByCertification) {
    groups.push({
      certificationId,
      certificationName: actionsForCertification[0]?.frameworkName ?? "",
      actions: actionsForCertification,
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
    const attachmentsForAction = attachmentMap.get(attachment.entityId) ?? [];
    attachmentsForAction.push({
      id: attachment.id,
      fileName: attachment.fileName,
      displayName: attachment.displayName,
    });
    attachmentMap.set(attachment.entityId, attachmentsForAction);
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
