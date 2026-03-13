export type ConnectorIconColorId = "charts.green" | "disabledForeground";

export function connectorIconColor(input: { is_online: boolean }): ConnectorIconColorId {
  return input.is_online ? "charts.green" : "disabledForeground";
}
