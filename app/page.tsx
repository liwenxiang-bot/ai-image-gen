"use client";

import { useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GenerationPanel from "@/components/generation/GenerationPanel";
import type { GenerationPanelHandle } from "@/components/generation/GenerationPanel";
import ImageGallery from "@/components/gallery/ImageGallery";
import ToastContainer, { toast } from "@/components/ui/Toast";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useHistory } from "@/hooks/useHistory";
import type { GenerationParams, HistoryItem } from "@/lib/types";

export default function Home() {
  const panelRef = useRef<GenerationPanelHandle>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { generate, isLoading, error, clearError } = useImageGeneration();
  const { history, addItem, removeItem, clearHistory } = useHistory();

  useEffect(() => {
    if (error) {
      toast(error, "error");
      clearError();
    }
  }, [error, clearError]);

  const handleGenerate = async (params: GenerationParams) => {
    const result = await generate(params);
    if (result) {
      addItem({
        prompt: params.prompt,
        imageBase64: result.image,
        mode: params.mode,
        size: params.size,
        quality: params.quality,
        revisedPrompt: result.revisedPrompt,
      });
      toast("图片生成成功！", "success");
      // Auto scroll to gallery
      setTimeout(() => {
        galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleEdit = (item: HistoryItem) => {
    panelRef.current?.setEditImage(item.imageBase64, item.prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-12">
            <GenerationPanel ref={panelRef} onGenerate={handleGenerate} isLoading={isLoading} />
          </div>

          <div ref={galleryRef}>
            <ImageGallery
              history={history}
              isLoading={isLoading}
              onDelete={removeItem}
              onClear={clearHistory}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </main>
      <Footer />
      <ToastContainer />
    </>
  );
}
