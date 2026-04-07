"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  scriptId: string;
  ideaTitle: string;
  version: number;
  isCurrent: boolean;
  content: string;
};

export function ScriptTeleprompterView({ scriptId, ideaTitle, version, isCurrent, content }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState(28);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showBar, setShowBar] = useState(true);

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          router.push("/script-library");
        }
      }
      if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void toggleFullscreen();
      }
      if (e.key === "b" || e.key === "B") {
        setShowBar((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, toggleFullscreen]);

  const isDark = theme === "dark";

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col overflow-hidden",
        isDark ? "bg-black text-zinc-100" : "bg-white text-zinc-900",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs transition-[opacity,max-height] duration-200",
          isDark ? "border-zinc-800 bg-black/90" : "border-zinc-200 bg-white/95",
          showBar ? "max-h-40 opacity-100" : "max-h-0 overflow-hidden border-transparent py-0 opacity-0",
        )}
      >
        <Link
          href="/script-library"
          className={cn("font-medium underline-offset-2 hover:underline", isDark ? "text-zinc-300" : "text-primary")}
        >
          ← 保管庫
        </Link>
        <span className="text-muted-foreground">|</span>
        <span className="max-w-[40vw] truncate font-medium">{ideaTitle}</span>
        <span className={cn("rounded px-1.5 py-0.5", isDark ? "bg-zinc-800" : "bg-muted")}>
          v{version}
          {isCurrent ? " · 現在版" : ""}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">
            <span className="text-[10px] opacity-80">文字</span>
            <input
              type="range"
              min={20}
              max={64}
              value={fontPx}
              onChange={(e) => setFontPx(Number(e.target.value))}
              className="h-1 w-24 accent-primary"
            />
            <span className="tabular-nums opacity-80">{fontPx}px</span>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 text-xs", isDark && "border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800")}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {isDark ? "白背景" : "黒背景"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 text-xs", isDark && "border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800")}
            onClick={() => void toggleFullscreen()}
          >
            全画面 (F)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("h-7 text-xs", isDark && "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100")}
            onClick={() => setShowBar(false)}
          >
            バー非表示
          </Button>
        </div>
      </div>

      {!showBar ? (
        <button
          type="button"
          aria-label="メニューを表示"
          className={cn(
            "fixed bottom-6 right-4 z-[110] flex h-12 w-12 items-center justify-center rounded-full shadow-lg",
            isDark ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600" : "bg-primary text-primary-foreground",
          )}
          onClick={() => setShowBar(true)}
        >
          ☰
        </button>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-6 sm:px-8" style={{ fontSize: fontPx, lineHeight: 1.65 }}>
        <article
          className="mx-auto max-w-4xl whitespace-pre-wrap font-sans tracking-wide selection:bg-primary/30"
          onDoubleClick={() => setShowBar((v) => !v)}
          title="ダブルクリックでバー表示/非表示"
        >
          {content}
        </article>
      </div>

      <div
        className={cn(
          "pointer-events-none fixed bottom-3 left-0 right-0 flex justify-center text-[10px] opacity-40",
          isDark ? "text-zinc-500" : "text-zinc-500",
        )}
      >
        ダブルタップでバー表示/非表示 · Escで保管庫へ · id: {scriptId.slice(0, 8)}…
      </div>
    </div>
  );
}
