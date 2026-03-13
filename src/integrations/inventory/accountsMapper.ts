import type { AccountFromApi } from "../../api/types";

export type AccountNodeVm = {
  accountId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapAccountsToNodes(accounts: AccountFromApi[]): AccountNodeVm[] {
  return accounts.map((a) => ({
    accountId: a.id,
    label: a.username,
    description: `${a.application_id.slice(0, 8)} · ${a.status}`,
    tooltipLines: [
      `**account_id:** ${a.id}`,
      `**application_id:** ${a.application_id}`,
      `**status:** ${a.status}`,
      `**subject_id:** ${a.subject_id ?? "(unbound)"}`,
      `**is_active:** ${a.is_active}`,
      `**is_privileged:** ${a.is_privileged}`,
      `**mfa_enabled:** ${a.mfa_enabled}`,
      `**updated_at:** ${a.updated_at}`,
    ],
  }));
}
