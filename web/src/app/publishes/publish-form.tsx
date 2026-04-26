"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ACTIVE_PUBLISH_PLATFORMS, type ActivePublishPlatform } from "@/types/domain";

import { createPublishEntry } from "./actions";

type IdeaOption = { id: string; title: string };

const PLATFORM_LABEL: Record<ActivePublishPlatform, string> = {
  instagram: "Instagram",
  xiaohongshu: "小紅書（XHS）",
  note: "Note",
};

export function PublishForm({ ideas }: { ideas: IdeaOption[] }) {
  const [platform, setPlatform] = useState<ActivePublishPlatform>("instagram");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await createPublishEntry(fd);
      if (res.error) {
        setError(res.error);
        setPending(false);
        return;
      }
      e.currentTarget.reset();
      setPlatform("instagram");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  const needsIdea = platform === "instagram" || platform === "xiaohongshu";
  const showStandaloneTitle = platform === "note";

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="platform" value={platform} />
      <div className="md:col-span-2 flex flex-wrap gap-2">
        <span className="w-full text-xs font-medium text-muted-foreground">媒体</span>
        {ACTIVE_PUBLISH_PLATFORMS.map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={platform === p ? "default" : "outline"}
            onClick={() => setPlatform(p)}
          >
            {PLATFORM_LABEL[p]}
          </Button>
        ))}
      </div>

      {needsIdea ? (
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">ネタ（必須）</label>
          <select
            name="idea_id"
            required
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">ネタを選択</option>
            {ideas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">既存のネタに紐づける（任意）</label>
            <select
              name="idea_id"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">紐づけない（独立した Note）</option>
              {ideas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          {showStandaloneTitle ? (
            <div>
              <label className="text-xs text-muted-foreground">独立 Note のタイトル（紐づけないとき必須）</label>
              <input
                name="standalone_title"
                placeholder="記事の見出し"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          ) : null}
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground">投稿日時</label>
        <input
          name="published_at"
          type="datetime-local"
          required
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <input
        name="platform_post_id"
        placeholder="投稿ID（任意）"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
      {needsIdea ? (
        <input
          name="content_type"
          defaultValue="short_video"
          placeholder="内容タイプ（例: short_video）"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      ) : (
        <input
          name="content_type_note"
          defaultValue="article"
          placeholder="内容タイプ（例: article）"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      )}
      <input
        name="url"
        placeholder="投稿URL（任意）"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
      />
      {error ? (
        <p className="md:col-span-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "投稿を保存"}
        </Button>
      </div>
    </form>
  );
}
