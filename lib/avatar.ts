// DiceBear avatar URL helper. Stateless, deterministic by seed.
// We use the "notionists" style (hand-drawn people), free CDN, no install.
// Docs: https://www.dicebear.com/styles/notionists

export function avatarUrl(seed: string, size = 64): string {
  const s = seed && seed.length > 0 ? seed : "anonymous";
  const url = new URL("https://api.dicebear.com/9.x/notionists/svg");
  url.searchParams.set("seed", s);
  url.searchParams.set("size", String(size));
  return url.toString();
}
