export const PINNED_REVISION = "1614293";

export function resolveRevision(envRevision?: string) {
  if (envRevision && envRevision.trim()) {
    return envRevision.trim();
  }
  return PINNED_REVISION;
}
