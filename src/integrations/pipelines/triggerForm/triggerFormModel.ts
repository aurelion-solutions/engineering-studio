/**
 * Pure logic for the trigger-run form.
 * No vscode import — safe to unit-test in plain Node.
 */

export type ParseArgsResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

export type ValidatePipelineNameResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Parse and validate a raw JSON string as pipeline args.
 * Accepts only JSON objects (not arrays, null, primitives).
 */
export function parseArgsJson(text: string): ParseArgsResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, error: "Args must not be empty. Use {} for no args." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return { ok: false, error: String(e) };
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return {
      ok: false,
      error: "Args must be a JSON object, e.g. {} or {\"key\": \"value\"}.",
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

/**
 * Validate that pipelineName is non-empty and present in known list.
 */
export function validatePipelineName(
  name: string,
  known: ReadonlyArray<string>,
): ValidatePipelineNameResult {
  if (name.trim() === "") {
    return { ok: false, error: "Pipeline name must not be empty." };
  }
  if (!known.includes(name)) {
    return { ok: false, error: `Pipeline "${name}" is not in the known list.` };
  }
  return { ok: true };
}
