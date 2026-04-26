"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ScriptStructuredData } from "@/lib/script-structured";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  scriptId: string;
  ideaTitle: string;
  displayTitle?: string | null;
  version: number;
  isCurrent: boolean;
  /** カンペ本体：セリフのみ（structured_data.rows[].audio 由来を推奨） */
  cueText: string;
  /** structured からセリフを組み立てたか / Markdown フォールバックか */
  cueSource: "structured" | "fallback";
  /** 秒数・映像・演出・字幕/BGMメモなど（別パネル用。DB の structured_data と同型） */
  productionMeta: ScriptStructuredData | null;
};

export function ScriptTeleprompterView({
  scriptId,
  ideaTitle,
  displayTitle,
  version,
  isCurrent,
  cueText,
  cueSource,
  productionMeta,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState(28);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showBar, setShowBar] = useState(true);
  const [showProductionPanel, setShowProductionPanel] = useState(false);

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
        if (showProductionPanel) {
          setShowProductionPanel(false);
          return;
        }
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
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && productionMeta) {
        setShowProductionPanel((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, toggleFullscreen, showProductionPanel, productionMeta]);

  const isDark = theme === "dark";

  const headerTitle = displayTitle?.trim() || ideaTitle;

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
          showBar ? "max-h-48 opacity-100" : "max-h-0 overflow-hidden border-transparent py-0 opacity-0",
        )}
      >
        <Link
          href="/script-library"
          className={cn("font-medium underline-offset-2 hover:underline", isDark ? "text-zinc-300" : "text-primary")}
        >
          ← 保管庫
        </Link>
        <span className="text-muted-foreground">|</span>
        <span className="max-w-[36vw] truncate font-medium" title={headerTitle}>
          {headerTitle}
        </span>
        <span className={cn("rounded px-1.5 py-0.5", isDark ? "bg-zinc-800" : "bg-muted")}>
          v{version}
          {isCurrent ? " · 現在版" : ""}
        </span>
        {cueSource === "structured" ? (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px]",
              isDark ? "bg-emerald-950 text-emerald-300" : "bg-emerald-100 text-emerald-900",
            )}
          >
            セリフのみ
          </span>
        ) : (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px]",
              isDark ? "bg-amber-950 text-amber-200" : "bg-amber-100 text-amber-900",
            )}
            title="編集画面で表形式を保存すると、セリフのみ表示に切り替わります"
          >
            全文表示
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {productionMeta ? (
            <Button
              type="button"
              size="sm"
              variant={showProductionPanel ? "default" : "outline"}
              className={cn(
                "h-7 text-xs",
                isDark && !showProductionPanel && "border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
              )}
              onClick={() => setShowProductionPanel((v) => !v)}
            >
              制作情報 (M)
            </Button>
          ) : null}
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

      {/* カンペ本文：読み上げセリフのみ */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-6 sm:px-8"
        style={{ fontSize: fontPx, lineHeight: 1.65 }}
      >
        <article
          className="mx-auto max-w-4xl whitespace-pre-wrap font-sans tracking-wide selection:bg-primary/30"
          onDoubleClick={() => setShowBar((v) => !v)}
          title="ダブルクリックでバー表示/非表示"
        >
          {cueText}
        </article>
      </div>

      {/* 制作情報オーバーレイ（秒数・映像・演出・メモ — 改善・撮影準備用） */}
      {showProductionPanel && productionMeta ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="制作情報"
        >
          <div
            className={cn(
              "max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-4 text-sm shadow-xl",
              isDark ? "border-zinc-700 bg-zinc-950 text-zinc-100" : "border-border bg-background text-foreground",
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">動画情報・メモ（DB structured_data）</p>
                <h2 className="text-base font-semibold leading-tight">
                  {productionMeta.episode_label || "（回タイトルなし）"}
                </h2>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowProductionPanel(false)}>
                閉じる
              </Button>
            </div>
            <dl className="space-y-2 text-xs">
              {productionMeta.theme ? (
                <>
                  <dt className="font-medium text-muted-foreground">テーマ</dt>
                  <dd className="whitespace-pre-wrap">{productionMeta.theme}</dd>
                </>
              ) : null}
              {productionMeta.target_audience ? (
                <>
                  <dt className="mt-2 font-medium text-muted-foreground">ターゲット</dt>
                  <dd className="whitespace-pre-wrap">{productionMeta.target_audience}</dd>
                </>
              ) : null}
              <dt className="mt-2 font-medium text-muted-foreground">尺（目安）</dt>
              <dd>
                {productionMeta.duration_sec_min}〜{productionMeta.duration_sec_max} 秒
              </dd>
            </dl>
            <div className="mt-4 space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">構成ブロック（秒数・映像・演出）</p>
              {productionMeta.rows.map((row, i) => (
                <div key={i} className="rounded-lg border border-border/80 p-2 text-xs">
                  {row.time_range ? (
                    <p className="font-mono text-[11px] text-primary">{row.time_range}</p>
                  ) : null}
                  {row.visual ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">映像: </span>
                      {row.visual}
                    </p>
                  ) : null}
                  {row.audio ? (
                    <p className="mt-1 text-muted-foreground">
                      <span className="text-muted-foreground">セリフ: </span>
                      {row.audio}
                    </p>
                  ) : null}
                  {row.direction ? (
                    <p className="mt-1 text-muted-foreground">
                      <span className="text-muted-foreground">演出: </span>
                      {row.direction}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {(productionMeta.subtitle_tips || productionMeta.bgm_tips || productionMeta.extra_notes) && (
              <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                {productionMeta.subtitle_tips ? (
                  <div>
                    <p className="font-medium text-muted-foreground">字幕（RED向け）</p>
                    <p className="mt-1 whitespace-pre-wrap">{productionMeta.subtitle_tips}</p>
                  </div>
                ) : null}
                {productionMeta.bgm_tips ? (
                  <div>
                    <p className="mt-1 font-medium text-muted-foreground">BGM</p>
                    <p className="mt-1 whitespace-pre-wrap">{productionMeta.bgm_tips}</p>
                  </div>
                ) : null}
                {productionMeta.extra_notes ? (
                  <div>
                    <p className="mt-1 font-medium text-muted-foreground">その他メモ</p>
                    <p className="mt-1 whitespace-pre-wrap">{productionMeta.extra_notes}</p>
                  </div>
                ) : null}
              </div>
            )}
            <p className="mt-4 text-[10px] text-muted-foreground">
              カンペ本体にはセリフのみ表示。ここは撮影・改善用の参照です。
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none fixed bottom-3 left-0 right-0 flex justify-center px-2 text-center text-[10px] opacity-40",
          isDark ? "text-zinc-500" : "text-zinc-500",
        )}
      >
        ダブルクリックでバー表示/非表示 · Esc（制作情報優先で閉じる）· Mで制作情報 · id: {scriptId.slice(0, 8)}…
      </div>
    </div>
  );
}
