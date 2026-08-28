const HANDLE = /^@[a-zA-Z0-9._]{2,32}$/;

export type Identity = {
  name: string;
  handle: string;
  url: string;
};

export function parseIdentity(rawName: string, rawUrl?: string): Identity | { error: string } {
  const nameIn = rawName.trim();
  const urlIn = (rawUrl ?? "").trim();

  if (!nameIn && !urlIn) {
    return { error: "Enter a name, URL, or @handle." };
  }

  if (nameIn.startsWith("@") && HANDLE.test(nameIn) && !urlIn) {
    const handle = nameIn.toLowerCase();
    return {
      name: handle,
      handle,
      url: `https://t.me/${handle.slice(1)}`,
    };
  }

  const maybeUrl = urlIn || nameIn;
  const url = normalizeHttpUrl(maybeUrl);
  if (!url) {
    if (!urlIn && nameIn) {
      return { error: "Add a https:// destination or an @handle." };
    }
    return { error: "Destination must be an http(s) URL." };
  }

  const display =
    nameIn && !/^https?:\/\//i.test(nameIn)
      ? nameIn.slice(0, 48)
      : displayFromUrl(url);

  const handle = display.startsWith("@")
    ? display.toLowerCase()
    : `@${slug(display)}`;

  return {
    name: display,
    handle: handle.slice(0, 34),
    url,
  };
}

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  parsed.hash = "";
  return parsed.toString();
}

function displayFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "t.me" || parsed.hostname.endsWith(".t.me")) {
      const part = parsed.pathname.split("/").filter(Boolean)[0];
      if (part) return `@${part}`;
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "listing";
  }
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 24);
  return cleaned || "listing";
}
