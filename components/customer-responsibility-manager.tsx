import { CustomerResponsibilityChecklist } from "@/components/customer-responsibility-checklist";
import { listActionsByVendor } from "@/lib/db/customer-responsibility";

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
}: {
  vendorId: string;
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

  return <CustomerResponsibilityChecklist groups={groups} />;
}
