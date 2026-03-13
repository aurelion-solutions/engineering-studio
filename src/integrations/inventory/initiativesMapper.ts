import type { InitiativeFromApi } from "../../api/types";

export type InitiativeNodeVm = {
  initiativeId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

function _truncateOrigin(origin: string, maxLen = 48): string {
  if (origin.length <= maxLen) {
    return origin;
  }
  return origin.substring(0, maxLen) + "…";
}

export function mapInitiativesToNodes(
  items: InitiativeFromApi[],
): InitiativeNodeVm[] {
  return items.map((item) => {
    const label = `${item.type}: ${_truncateOrigin(item.origin)}`;
    const description = item.valid_until
      ? `${item.valid_from} … ${item.valid_until}`
      : `${item.valid_from} …`;
    const tooltipLines = [
      `**id:** ${item.id}`,
      `**access_fact_id:** ${item.access_fact_id}`,
      `**type:** ${item.type}`,
      `**origin:** ${item.origin}`,
      `**valid_from:** ${item.valid_from}`,
      `**valid_until:** ${item.valid_until ?? "(open)"}`,
      `**created_at:** ${item.created_at}`,
      `**updated_at:** ${item.updated_at}`,
    ];
    return {
      initiativeId: item.id,
      label,
      description,
      tooltipLines,
    };
  });
}
