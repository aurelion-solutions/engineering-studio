import type { ArtifactBindingFromApi } from "../../api/types";

export type ArtifactBindingNodeVm = {
  bindingId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

function _buildTargetSummary(binding: ArtifactBindingFromApi): string {
  const parts: string[] = [];
  if (binding.access_fact_id !== null) {
    parts.push("fact");
  }
  if (binding.resource_id !== null) {
    parts.push("resource");
  }
  if (binding.account_id !== null) {
    parts.push("account");
  }
  return parts.join(" + ") || "unknown";
}

export function mapArtifactBindingsToNodes(
  bindings: ArtifactBindingFromApi[],
): ArtifactBindingNodeVm[] {
  return bindings.map((binding) => {
    const artifactShort = binding.artifact_id.substring(0, 8);
    const targetSummary = _buildTargetSummary(binding);
    const tooltipLines = [
      `**binding_id:** ${binding.id}`,
      `**artifact_id:** ${binding.artifact_id}`,
      ...(binding.access_fact_id !== null
        ? [`**access_fact_id:** ${binding.access_fact_id}`]
        : []),
      ...(binding.resource_id !== null
        ? [`**resource_id:** ${binding.resource_id}`]
        : []),
      ...(binding.account_id !== null
        ? [`**account_id:** ${binding.account_id}`]
        : []),
      `**created_at:** ${binding.created_at}`,
    ];
    return {
      bindingId: binding.id,
      label: `${artifactShort}… -> ${targetSummary}`,
      description: binding.created_at,
      tooltipLines,
    };
  });
}
