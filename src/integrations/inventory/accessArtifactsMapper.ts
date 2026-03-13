import type { AccessArtifactFromApi } from "../../api/types";

export type AccessArtifactNodeVm = {
  artifactId: string;
  label: string;
  description: string;
  tooltipLines: string[];
};

export function mapAccessArtifactsToNodes(
  artifacts: AccessArtifactFromApi[],
): AccessArtifactNodeVm[] {
  return artifacts.map((a) => {
    const tooltipLines = [
      `**artifact_id:** ${a.id}`,
      `**application_id:** ${a.application_id}`,
      `**source_kind:** ${a.source_kind}`,
      `**external_id:** ${a.external_id}`,
      ...(a.ingest_batch_id ? [`**ingest_batch_id:** ${a.ingest_batch_id}`] : []),
      `**ingested_at:** ${a.ingested_at}`,
    ];
    return {
      artifactId: a.id,
      label: a.external_id,
      description: `${a.source_kind} \u00b7 ${a.ingested_at}`,
      tooltipLines,
    };
  });
}
