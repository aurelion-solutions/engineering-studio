import type { OwnershipAssignmentFromApi } from "../../api/types";

export type OwnershipAssignmentNodeVm = {
  assignmentId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapOwnershipAssignmentsToNodes(
  items: OwnershipAssignmentFromApi[],
): OwnershipAssignmentNodeVm[] {
  return items.map((item) => {
    const targetShortId =
      item.resource_id !== null
        ? `res:${item.resource_id.substring(0, 8)}`
        : `acc:${(item.account_id ?? "").substring(0, 8)}`;

    const label = `${item.kind} · ${targetShortId}`;
    const description = `subject ${item.subject_id.substring(0, 8)}`;

    const tooltipLines = [
      `**id:** ${item.id}`,
      `**subject_id:** ${item.subject_id}`,
      `**kind:** ${item.kind}`,
      `**resource_id:** ${item.resource_id ?? "(n/a)"}`,
      `**account_id:** ${item.account_id ?? "(n/a)"}`,
      `**created_at:** ${item.created_at}`,
    ];

    return {
      assignmentId: item.id,
      label,
      description,
      tooltipLines,
    };
  });
}
