import type { AccessFactFromApi } from "../../api/types";

export type AccessFactNodeVm = {
  factId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapAccessFactsToNodes(facts: AccessFactFromApi[]): AccessFactNodeVm[] {
  return facts.map((f) => {
    const subjectShort = f.subject_id.substring(0, 8);
    const resourceShort = f.resource_id.substring(0, 8);
    const validity = f.valid_until ? `until ${f.valid_until}` : "open";
    const tooltipLines = [
      `**fact_id:** ${f.id}`,
      `**subject_id:** ${f.subject_id}`,
      ...(f.account_id ? [`**account_id:** ${f.account_id}`] : []),
      `**resource_id:** ${f.resource_id}`,
      `**action:** ${f.action}`,
      `**effect:** ${f.effect}`,
      `**valid_from:** ${f.valid_from}`,
      ...(f.valid_until ? [`**valid_until:** ${f.valid_until}`] : []),
      `**created_at:** ${f.created_at}`,
    ];
    return {
      factId: f.id,
      label: `${subjectShort}… ${f.action} [${f.effect}]`,
      description: `${resourceShort}… · ${validity}`,
      tooltipLines,
    };
  });
}
