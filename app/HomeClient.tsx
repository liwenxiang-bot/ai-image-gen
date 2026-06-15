"use client";

import { useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GenerationPanel from "@/components/generation/GenerationPanel";
import type { GenerationPanelHandle } from "@/components/generation/GenerationPanel";
import ImageGallery from "@/components/gallery/ImageGallery";
import type { ActiveJob } from "@/components/gallery/ImageGallery";
import ToastContainer, { toast } from "@/components/ui/Toast";
import { useJobs } from "@/hooks/useJobs";
import { isAuthExpiredError } from "@/hooks/useAuthRedirect";
import { useHistory } from "@/hooks/useHistory";
import { useQuota } from "@/hooks/useQuota";
import type { GenerationParams, HistoryItem } from "@/lib/types";

export default function HomeClient() {
  const panelRef = useRef<GenerationPanelHandle>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { jobs, submitJob, retryJob, cancelJob, onCompleted, onFailed } = useJobs();
  const { history, removeItem, setItemVisibility, reload: reloadHistory } = useHistory();
  const { quota, refresh: refreshQuota } = useQuota();

  // When a job finishes, reload history once and notify the user.
  useEffect(() => {
    const off1 = onCompleted(() => {
      void reloadHistory();
      toast("图片生成成功！", "success");
    });
    const off2 = onFailed((job) => {
      toast(job.errorMessage || "生成失败，请重试", "error");
    });
    return () => {
      off1();
      off2();
    };
  }, [onCompleted, onFailed, reloadHistory]);

  const handleGenerate = async (params: GenerationParams) => {
    try {
      await submitJob({
        prompt: params.prompt,
        mode: params.mode,
        size: params.size,
        quality: params.quality,
        images: params.images,
      });
      toast("任务已提交，可随时切换页面", "success");
      void refreshQuota();
      setTimeout(() => {
        galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      if (isAuthExpiredError(err)) return;
      const message = err instanceof Error ? err.message : "提交失败";
      toast(message, "error");
      void refreshQuota();
    }
  };

  const handleEdit = async (item: HistoryItem) => {
    try {
      const res = await fetch(item.imageUrl, { mode: "cors" });
      const blob = await res.blob();
      const b64 = await blobToBase64(blob);
      panelRef.current?.setEditImage(b64, item.prompt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast("图片加载失败，请重试", "error");
    }
  };

  const handleTogglePublic = (id: string, isPublic: boolean) => {
    void setItemVisibility(id, isPublic);
    toast(isPublic ? "已公开到画廊" : "已设为私有", "success");
  };

  const activeJobs: ActiveJob[] = jobs
    .filter((j) => j.status === "queued" || j.status === "running" || j.status === "failed")
    .map((j) => ({
      id: j.id,
      prompt: j.prompt,
      status: j.status as "queued" | "running" | "failed",
      errorMessage: j.errorMessage,
    }));

  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Suspense fallback={null}>
            <PromptFromQuery panelRef={panelRef} />
          </Suspense>
          <Suspense fallback={null}>
            <PayReturnHandler onPaid={refreshQuota} />
          </Suspense>

          <div className="mb-12">
            <GenerationPanel ref={panelRef} onGenerate={handleGenerate} isLoading={false} quota={quota} />
          </div>

          <div ref={galleryRef}>
            <ImageGallery
              history={history}
              activeJobs={activeJobs}
              onDelete={removeItem}
              onEdit={handleEdit}
              onTogglePublic={handleTogglePublic}
              onRetryJob={(id) => {
                retryJob(id)
                  .then(() => refreshQuota())
                  .catch((err) => {
                    if (isAuthExpiredError(err)) return;
                    toast(err instanceof Error ? err.message : "重试失败", "error");
                    void refreshQuota();
                  });
              }}
              onCancelJob={(id) => {
                cancelJob(id)
                  .then(() => refreshQuota())
                  .catch((err) => {
                    if (isAuthExpiredError(err)) return;
                    toast(err instanceof Error ? err.message : "取消失败", "error");
                  });
              }}
            />
          </div>
        </div>
      </main>
      <ToastContainer />
    </>
  );
}

/**
 * Reads `?prompt=` from the URL and fills the prompt input on mount, then
 * cleans the URL. Isolated inside a Suspense boundary because `useSearchParams`
 * triggers a CSR bailout that would otherwise fail the production build.
 */
function PromptFromQuery({
  panelRef,
}: {
  panelRef: React.RefObject<GenerationPanelHandle | null>;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromGallery = searchParams.get("prompt");
    if (fromGallery) {
      panelRef.current?.setPrompt(fromGallery);
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, panelRef]);

  return null;
}

/**
 * 支付收银台 return_url 跳回后（?pay=done&out_trade_no=xxx），轮询订单状态确认积分
 * 到账（异步回调可能略晚于跳转），到账后刷新积分余额并提示，再清理 URL。
 */
function PayReturnHandler({ onPaid }: { onPaid: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("pay") !== "done") return;
    const outTradeNo = searchParams.get("out_trade_no");

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("pay");
      url.searchParams.delete("out_trade_no");
      url.searchParams.delete("trade_no");
      window.history.replaceState({}, "", url.toString());
    };

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        if (outTradeNo) {
          const res = await fetch(
            `/api/pay/status?out_trade_no=${encodeURIComponent(outTradeNo)}`,
            { cache: "no-store" },
          );
          const data = await res.json();
          if (res.ok && data.status === "paid") {
            onPaid();
            toast("支付成功，积分已到账！", "success");
            cleanUrl();
            return;
          }
        }
      } catch {
        // ignore, will retry
      }
      if (attempts >= 6) {
        // 回调可能还没到，刷新一次让用户看到最新余额，并清理 URL
        onPaid();
        cleanUrl();
        return;
      }
      window.setTimeout(poll, 1500);
    };

    void poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("read failed"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}