import type { SubjectFromApi } from "../../api/types";

export type SubjectNodeVm = {
  subjectId: string;
  label: string;
  description: string;
  tooltipLines: string[];
  contextValue: string;
};

export function mapSubjectsToNodes(subjects: SubjectFromApi[]): SubjectNodeVm[] {
  return subjects.map((s) => {
    const principalLine = s.principal_employee_id
      ? `**principal_employee_id:** ${s.principal_employee_id}`
      : s.principal_nhi_id
        ? `**principal_nhi_id:** ${s.principal_nhi_id}`
        : `**principal_customer_id:** ${s.principal_customer_id ?? "(none)"}`;

    const tooltipLines = [
      `**subject_id:** ${s.id}`,
      `**kind:** ${s.kind}`,
      ...(s.nhi_kind ? [`**nhi_kind:** ${s.nhi_kind}`] : []),
      `**status:** ${s.status}`,
      principalLine,
      `**updated_at:** ${s.updated_at}`,
    ];

    return {
      subjectId: s.id,
      label: s.external_id,
      description: `${s.kind} · ${s.status}`,
      tooltipLines,
      contextValue: "aurelion.subjectItem",
    };
  });
}
