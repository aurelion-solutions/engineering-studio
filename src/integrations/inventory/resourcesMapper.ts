import type { ResourceFromApi } from "../../api/types";

export type ResourceNodeVm = {
  resourceId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapResourcesToNodes(
  resources: ResourceFromApi[],
): ResourceNodeVm[] {
  return resources.map((r) => {
    const tooltipLines = [
      `**resource_id:** ${r.id}`,
      `**application_id:** ${r.application_id}`,
      `**kind:** ${r.kind}`,
      ...(r.environment ? [`**environment:** ${r.environment}`] : []),
      ...(r.data_sensitivity
        ? [`**data_sensitivity:** ${r.data_sensitivity}`]
        : []),
      ...(r.parent_id ? [`**parent_id:** ${r.parent_id}`] : []),
      ...(r.path ? [`**path:** ${r.path}`] : []),
      `**updated_at:** ${r.updated_at}`,
    ];

    return {
      resourceId: r.id,
      label: r.external_id,
      description: `${r.kind} · ${r.privilege_level ?? "—"}`,
      tooltipLines,
    };
  });
}
