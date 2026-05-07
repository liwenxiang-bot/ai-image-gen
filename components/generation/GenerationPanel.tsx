"use client";

import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import ModeToggle from "./ModeToggle";
import PromptInput from "./PromptInput";
import ImageUpload from "./ImageUpload";
import SettingsBar from "./SettingsBar";
import Button from "@/components/ui/Button";
import { Wand2, RefreshCw } from "lucide-react";
import type { GenerationMode, ImageSize, ImageQuality, GenerationParams } from "@/lib/types";

const ALL_PROMPT_IDEAS = [
  { tag: "创意", text: "一只戴着宇航员头盔的柴犬在月球上散步，地球在背景中" },
  { tag: "赛博朋克", text: "赛博朋克风格的东京街头，霓虹灯倒映在雨后的地面上" },
  { tag: "奇幻", text: "一本打开的魔法书，书页中飞出彩色蝴蝶和星辰" },
  { tag: "国风", text: "水彩风格的江南水乡，小桥流水人家，烟雨朦胧" },
  { tag: "超现实", text: "一杯冒着热气的咖啡，杯中倒映着整个宇宙星空" },
  { tag: "吉卜力", text: "吉卜力风格的森林小屋，阳光穿过树叶洒落" },
  { tag: "像素风", text: "像素风格的中世纪城堡，8-bit 复古游戏画面" },
  { tag: "写实", text: "雪山脚下的湖泊倒影，金色夕阳照耀，超高清摄影" },
  { tag: "插画", text: "一个小女孩坐在鲸鱼背上飞越云海，扁平插画风格" },
  { tag: "美食", text: "一碗热腾腾的日式拉面，俯拍视角，食物摄影风格" },
  { tag: "建筑", text: "未来主义风格的海上漂浮城市，白色曲线建筑" },
  { tag: "动漫", text: "樱花树下的少女回眸微笑，日系动漫风格，光影唯美" },
];

const DISPLAY_COUNT = 4;

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface GenerationPanelProps {
  onGenerate: (params: GenerationParams) => void;
  isLoading: boolean;
}

export interface GenerationPanelHandle {
  setEditImage: (imageBase64: string, prompt: string) => void;
}

const GenerationPanel = forwardRef<GenerationPanelHandle, GenerationPanelProps>(
  ({ onGenerate, isLoading }, ref) => {
    const [mode, setMode] = useState<GenerationMode>("text-to-image");
    const [prompt, setPrompt] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [size, setSize] = useState<ImageSize>("1024x1024");
    const [quality, setQuality] = useState<ImageQuality>("auto");
    const [ideas, setIdeas] = useState(() => ALL_PROMPT_IDEAS.slice(0, DISPLAY_COUNT));

    useEffect(() => {
      setIdeas(shuffleAndPick(ALL_PROMPT_IDEAS, DISPLAY_COUNT));
    }, []);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [translation, setTranslation] = useState("");

    const refreshIdeas = () => setIdeas(shuffleAndPick(ALL_PROMPT_IDEAS, DISPLAY_COUNT));

    const handleEnhance = async () => {
      if (!prompt.trim() || isEnhancing) return;
      setIsEnhancing(true);
      setTranslation("");
      try {
        const res = await fetch("/api/enhance-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim() }),
        });
        const data = await res.json();
        if (data.success && data.prompt) {
          setPrompt(data.prompt);
          if (data.translation) setTranslation(data.translation);
        }
      } catch {
        // silently fail, user can retry
      } finally {
        setIsEnhancing(false);
      }
    };

    useImperativeHandle(ref, () => ({
      setEditImage(imageBase64: string, promptText: string) {
        setMode("image-to-image");
        setImage(imageBase64);
        setPrompt(promptText);
      },
    }));

    const [isMac, setIsMac] = useState(false);
    useEffect(() => {
      setIsMac(navigator.platform.toUpperCase().includes("MAC"));
    }, []);

    const canSubmit =
      prompt.trim().length > 0 &&
      (mode === "text-to-image" || image !== null) &&
      !isLoading;

    const handleSubmit = () => {
      if (!canSubmit) return;
      onGenerate({
        prompt: prompt.trim(),
        mode,
        image: image ?? undefined,
        size,
        quality,
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div className="rounded-2xl border border-border bg-background p-5 shadow-sm" onKeyDown={handleKeyDown}>
        <div className="flex flex-col gap-4">
          <ModeToggle mode={mode} onChange={setMode} />

          <PromptInput
            value={prompt}
            onChange={(v) => {
              setPrompt(v);
              if (translation) setTranslation("");
            }}
            disabled={isLoading}
            onEnhance={handleEnhance}
            isEnhancing={isEnhancing}
          />
          <p className="-mt-2 text-[10px] text-muted-foreground text-right hidden sm:block">{isMac ? "⌘" : "Ctrl"}+Enter 快速生成</p>

          {translation && (
            <div className="rounded-lg bg-accent/5 border border-accent/10 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-accent">中文释义：</span>{translation}
            </div>
          )}

          {!prompt && mode === "text-to-image" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">试试这些灵感</span>
                <button
                  onClick={refreshIdeas}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  换一批
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ideas.map((idea) => (
                  <button
                    key={idea.text}
                    onClick={() => setPrompt(idea.text)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-accent font-medium">{idea.tag}</span>
                    <span className="text-muted-foreground line-clamp-1">{idea.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "image-to-image" && (
            <ImageUpload image={image} onImageChange={setImage} disabled={isLoading} />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SettingsBar
              size={size}
              quality={quality}
              onSizeChange={setSize}
              onQualityChange={setQuality}
              disabled={isLoading}
            />
            <div className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isLoading}
                className="w-full sm:w-auto"
              >
                <Wand2 className="h-4 w-4" />
                {isLoading ? "生成中..." : "生成图片"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GenerationPanel.displayName = "GenerationPanel";

export default GenerationPanel;
