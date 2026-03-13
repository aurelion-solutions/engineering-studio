import type { ApplicationFromApi } from "../../api/types";

export type ApplicationNodeVm = {
  id: string;
  label: string;
};

export function applicationsToNodes(
  apps: ApplicationFromApi[],
): ApplicationNodeVm[] {
  return apps.map((a) => ({ id: a.id, label: a.name }));
}
