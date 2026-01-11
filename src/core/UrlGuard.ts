export type UrlGuardOptions = {
  allowFileUrl?: boolean;
};

export function ensureAllowedUrl(url: string, options: UrlGuardOptions = {}) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return;
  }
  if (parsed.protocol === "file:" && options.allowFileUrl) {
    return;
  }
  throw new Error(`URL protocol not allowed: ${parsed.protocol}`);
}
