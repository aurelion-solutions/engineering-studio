import type { AccessUsageFactFromApi } from "../../api/types";

export type AccessUsageFactNodeVm = {
  usageFactId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapAccessUsageFactsToNodes(
  items: AccessUsageFactFromApi[],
): AccessUsageFactNodeVm[] {
  return items.map((item) => {
    const lastSeenShort = item.last_seen.substring(0, 16).replace("T", " ");
    const label = `${item.usage_count}× · ${lastSeenShort}`;
    const description = `fact ${item.access_fact_id.substring(0, 8)}`;

    const tooltipLines = [
      `**id:** ${item.id}`,
      `**access_fact_id:** ${item.access_fact_id}`,
      `**usage_count:** ${item.usage_count}`,
      `**last_seen:** ${item.last_seen}`,
      `**window_from:** ${item.window_from}`,
      `**window_to:** ${item.window_to !== null ? item.window_to : "(open-ended)"}`,
      `**created_at:** ${item.created_at}`,
    ];

    return {
      usageFactId: item.id,
      label,
      description,
      tooltipLines,
    };
  });
}
