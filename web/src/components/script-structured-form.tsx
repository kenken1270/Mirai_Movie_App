"use client";

import { useState } from "react";
import Link from "next/link";

import { saveStructuredScript } from "@/app/script-library/actions";
import type { ScriptStructuredData, ScriptStructuredRow } from "@/lib/script-structured";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  scriptId: string;
  initialDisplayTitle: string;
  initialData: ScriptStructuredData;
  isCurrent: boolean;
};

export function ScriptStructuredForm({ scriptId, initialDisplayTitle, initialData, isCurrent }: Props) {
  const [displayTitle, setDisplayTitle] = useState(initialDisplayTitle);
  const [data, setData] = useState<ScriptStructuredData>(initialData);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const updateRow = (i: number, field: keyof ScriptStructuredRow, value: string) => {
    setData((d) => {
      const rows = [...d.rows];
      rows[i] = { ...rows[i], [field]: value };
      return { ...d, rows };
    });
  };

  const addRow = () =>
    setData((d) => ({
      ...d,
      rows: [...d.rows, { time_range: "", visual: "", audio: "", direction: "" }],
    }));

  const removeRow = (i: number) =>
    setData((d) => ({
      ...d,
      rows: d.rows.length <= 1 ? d.rows : d.rows.filter((_, j) => j !== i),
    }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const merged: ScriptStructuredData = {
      ...data,
      episode_label: displayTitle.trim() || data.episode_label,
    };
    const res = await saveStructuredScript({ scriptId, displayTitle, data: merged });
    setPending(false);
    if (!res.ok) {
      setMsg(res.message);
    } else {
      setMsg("保存しました。カンペ表示では下の「Markdown全文」が使われます。");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {!isCurrent ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          これは過去バージョンです。撮影用は通常「現在版」を編集してください。
        </p>
      ) : null}

      {msg ? (
        <p className={`text-sm ${msg.startsWith("保存") ? "text-emerald-600" : "text-destructive"}`}>{msg}</p>
      ) : null}

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">基本情報</h2>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">表示タイトル（保管庫・一覧に出る名前）</span>
          <input
            value={displayTitle}
            onChange={(e) => setDisplayTitle(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="第1回：…"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">テーマ</span>
          <textarea
            value={data.theme}
            onChange={(e) => setData((d) => ({ ...d, theme: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">ターゲット</span>
          <textarea
            value={data.target_audience}
            onChange={(e) => setData((d) => ({ ...d, target_audience: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">尺（秒・最小）</span>
            <input
              type="number"
              min={5}
              max={600}
              value={data.duration_sec_min}
              onChange={(e) =>
                setData((d) => ({ ...d, duration_sec_min: Number(e.target.value) || 0 }))
              }
              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
          <span className="pb-2 text-muted-foreground">〜</span>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">尺（秒・最大）</span>
            <input
              type="number"
              min={5}
              max={600}
              value={data.duration_sec_max}
              onChange={(e) =>
                setData((d) => ({ ...d, duration_sec_max: Number(e.target.value) || 0 }))
              }
              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">構成表（秒数ごと）</h2>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            行を追加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">足りない行は「行を追加」で増やせます。不要な行は削除できます。</p>
        <div className="space-y-4">
          {data.rows.map((row, i) => (
            <div key={i} className="space-y-2 rounded-md border border-dashed p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">ブロック {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removeRow(i)}>
                  削除
                </Button>
              </div>
              <input
                value={row.time_range}
                onChange={(e) => updateRow(i, "time_range", e.target.value)}
                placeholder="秒数（例: 0-3s）"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <textarea
                value={row.visual}
                onChange={(e) => updateRow(i, "visual", e.target.value)}
                placeholder="映像イメージ"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <textarea
                value={row.audio}
                onChange={(e) => updateRow(i, "audio", e.target.value)}
                placeholder="音声・セリフ（日本語）"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <textarea
                value={row.direction}
                onChange={(e) => updateRow(i, "direction", e.target.value)}
                placeholder="演出のポイント（バズ攻略）"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">バズらせるための一工夫</h2>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">字幕（RED向け）</span>
          <textarea
            value={data.subtitle_tips}
            onChange={(e) => setData((d) => ({ ...d, subtitle_tips: e.target.value }))}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">BGM</span>
          <textarea
            value={data.bgm_tips}
            onChange={(e) => setData((d) => ({ ...d, bgm_tips: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">その他メモ（任意）</span>
          <textarea
            value={data.extra_notes}
            onChange={(e) => setData((d) => ({ ...d, extra_notes: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="撮影日・機材・リテイクメモなど"
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存（Markdownを再生成）"}
        </Button>
        <Link
          href={`/script-library/${scriptId}`}
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          カンペ表示
        </Link>
        <Link href="/script-library" className={cn(buttonVariants({ variant: "ghost", size: "default" }))}>
          一覧へ
        </Link>
      </div>
    </form>
  );
}
