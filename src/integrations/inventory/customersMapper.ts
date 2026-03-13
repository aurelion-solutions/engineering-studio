import type { CustomerFromApi } from "../../api/types";

export type CustomerNodeVm = {
  customerId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapCustomersToNodes(customers: CustomerFromApi[]): CustomerNodeVm[] {
  return customers.map((c) => ({
    customerId: c.id,
    label: c.external_id,
    description: c.plan_tier ?? "",
    tooltipLines: [
      `**customer_id:** ${c.id}`,
      `**tenant_id:** ${c.tenant_id ?? "(none)"}`,
      `**mfa_enabled:** ${c.mfa_enabled}`,
      `**is_locked:** ${c.is_locked}`,
      `**updated_at:** ${c.updated_at}`,
    ],
  }));
}
