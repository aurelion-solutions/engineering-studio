import type { ConnectorInstanceFromApi } from "../../api/types";

export type ConnectorNodeVm = {
  id: string;           // composite: `${appId}/${instance.id}`
  instanceId: string;   // raw instance.instance_id (for tooltip codeblock and copy-id step 5)
  instanceRowId: string; // instance.id (UUID row id)
  label: string;        // = instance.instance_id
  isOnline: boolean;
  lastSeenAt: string;   // ISO raw; formatting done by the provider
  tags: string[];
};

export function connectorInstancesToNodes(
  appId: string,
  instances: ConnectorInstanceFromApi[],
): ConnectorNodeVm[] {
  return instances.map((instance) => ({
    id: `${appId}/${instance.id}`,
    instanceId: instance.instance_id,
    instanceRowId: instance.id,
    label: instance.instance_id,
    isOnline: instance.is_online,
    lastSeenAt: instance.last_seen_at,
    tags: instance.tags,
  }));
}
