/**
 * Pure URI helpers for the aurelion-logs: scheme.
 * No vscode import — unit-testable via `node --test`.
 */

export const LOGS_SCHEME = "aurelion-logs";

export type LogUriParts = {
  scheme: string;
  path: string;
  query: string;
};

/**
 * Converts an application name into a URL-safe slug for the URI path component.
 *
 * Algorithm (D2):
 * 1. null/undefined/blank → "app"
 * 2. toLowerCase()
 * 3. replace(/[^a-z0-9]+/g, "-") — collapse non-alphanumeric sequences to single dash
 * 4. trim leading/trailing dashes
 * 5. empty after normalization → "app"
 * 6. hard-cap at 64 chars, trim trailing dash after cut
 */
export function slugifyAppName(name: string | null | undefined): string {
  if (name == null || name.trim() === "") {
    return "app";
  }
  let s = name.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  if (s === "") {
    return "app";
  }
  if (s.length > 64) {
    s = s.slice(0, 64).replace(/-+$/, "");
  }
  return s === "" ? "app" : s;
}

/**
 * Builds the pure URI parts for a log document.
 * Path = /<slug>, query = id=<urlEncoded appId>.
 */
export function buildLogUriParts(app: {
  id: string;
  name: string;
}): LogUriParts {
  return {
    scheme: LOGS_SCHEME,
    path: "/" + slugifyAppName(app.name),
    query: "id=" + encodeURIComponent(app.id),
  };
}

/**
 * Extracts the appId from a URI query string of the form "id=<appId>".
 * Returns undefined when the param is absent or empty.
 */
export function parseAppIdFromQuery(query: string): string | undefined {
  const params = new URLSearchParams(query);
  const id = params.get("id");
  return id != null && id.length > 0 ? id : undefined;
}
