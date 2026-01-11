export const PINNED_REVISION = "1567454";

export function resolveRevision(envRevision?: string) {
  if (envRevision && envRevision.trim()) {
    return envRevision.trim();
  }
  return PINNED_REVISION;
}
