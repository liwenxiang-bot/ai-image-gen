import Gallery from "@/components/gallery/Gallery";

export const metadata = {
  title: "画廊 — GPT Image 2",
  description: "由社区用户公开分享的 AI 画作。一键复用任何一张作品的提示词。",
};

export default function GalleryPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">画廊</h1>
          <p className="mt-1.5 text-sm text-foreground/60">
            来自社区的 AI 画作 · 点开任意一张，一键复用提示词
          </p>
        </div>
        <Gallery />
      </div>
    </main>
  );
}
