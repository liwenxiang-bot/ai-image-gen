// DiceBear avatar URL helper. Stateless, deterministic by seed.
// We use the "thumbs" style (cute monsters/creatures), free CDN, no install.
// Docs: https://www.dicebear.com/styles/thumbs

export function avatarUrl(seed: string, size = 64): string {
  // The seed is normalized so empty / short ids still get a stable look.
  const s = seed && seed.length > 0 ? seed : "anonymous";
  const url = new URL("https://api.dicebear.com/9.x/thumbs/svg");
  url.searchParams.set("seed", s);
  url.searchParams.set("size", String(size));
  return url.toString();
}
