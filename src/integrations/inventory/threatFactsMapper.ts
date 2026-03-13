import type { ThreatFactFromApi } from "../../api/types";

export type ThreatFactNodeVm = {
  factId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapThreatFactsToNodes(
  items: ThreatFactFromApi[],
): ThreatFactNodeVm[] {
  return items.map((item) => {
    const subjectIdShort = item.subject_id.substring(0, 8);
    const label = `risk ${item.risk_score.toFixed(2)} · subj ${subjectIdShort}`;

    const count = item.active_indicators.length;
    const description =
      count === 1 ? "1 indicator" : `${count} indicators`;

    const tooltipLines = [
      `**id:** ${item.id}`,
      `**subject_id:** ${item.subject_id}`,
      `**account_id:** ${item.account_id !== null ? item.account_id : "(none)"}`,
      `**risk_score:** ${item.risk_score}`,
      `**active_indicators:** ${item.active_indicators.length > 0 ? item.active_indicators.join(", ") : "(none)"}`,
      `**last_login_at:** ${item.last_login_at !== null ? item.last_login_at : "(never observed)"}`,
      `**failed_auth_count:** ${item.failed_auth_count}`,
      `**observed_at:** ${item.observed_at}`,
      `**updated_at:** ${item.updated_at}`,
    ];

    return {
      factId: item.id,
      label,
      description,
      tooltipLines,
    };
  });
}
