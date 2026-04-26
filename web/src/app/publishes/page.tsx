import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publishPlatformLabelJa } from "@/lib/publish-platform-label";
import { listPipelineIdeas, listPublishes } from "@/lib/repositories/loop-repository";
import type { IdeaRow, PublishPlatform } from "@/types/domain";

import { PublishForm } from "./publish-form";

export const dynamic = "force-dynamic";

type PublishWithIdea = {
  id: string;
  idea_id: string | null;
  title: string | null;
  platform: PublishPlatform;
  platform_post_id: string | null;
  published_at: string;
  content_type: string;
  url: string | null;
  ideas?: { title?: string } | null;
};

export default async function PublishesPage() {
  const [{ data: ideasData }, { data: publishData, error }] = await Promise.all([
    listPipelineIdeas(),
    listPublishes(),
  ]);
  const ideas = (ideasData ?? []) as IdeaRow[];
  const publishes = (publishData ?? []) as PublishWithIdea[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>投稿記録</CardTitle>
          <CardDescription>
            新規は <strong>Instagram / 小紅書 / Note</strong> のみ。Note はネタに紐づけるか、独立記事としてタイトルのみでも登録できます（過去データの他媒体は一覧に残ります）。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">投稿を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <PublishForm ideas={ideas.map((item) => ({ id: item.id, title: item.title }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">投稿一覧</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {publishes.length === 0 ? (
            <p className="text-sm text-muted-foreground">投稿データがまだありません。</p>
          ) : (
            <div className="space-y-3">
              {publishes.map((row) => {
                const displayTitle =
                  row.ideas?.title ?? row.title ?? (row.idea_id ? "（タイトルなし）" : "（独立 Note）");
                return (
                <div key={row.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{displayTitle}</p>
                    {row.idea_id ? (
                    <Link
                      href={`/ideas/${row.idea_id}`}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      ネタ詳細
                    </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">ネタ未紐づけ</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{publishPlatformLabelJa(row.platform)}</span>
                    <span>{new Date(row.published_at).toLocaleString("ja-JP")}</span>
                    <span>type: {row.content_type}</span>
                  </div>
                  {row.url ? (
                    <a href={row.url} className="mt-1 block text-xs text-primary underline" target="_blank" rel="noreferrer">
                      {row.url}
                    </a>
                  ) : null}
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
