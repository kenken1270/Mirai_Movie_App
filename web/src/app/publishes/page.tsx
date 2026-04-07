import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPublish,
  listPipelineIdeas,
  listPublishes,
  moveIdeaStatus,
} from "@/lib/repositories/loop-repository";
import type { IdeaRow, PublishPlatform } from "@/types/domain";

export const dynamic = "force-dynamic";

type PublishWithIdea = {
  id: string;
  idea_id: string;
  platform: PublishPlatform;
  platform_post_id: string | null;
  published_at: string;
  content_type: string;
  url: string | null;
  ideas?: { title?: string } | null;
};

const platformOptions: PublishPlatform[] = ["instagram", "youtube", "tiktok", "x", "other"];

export default async function PublishesPage() {
  async function onCreatePublish(formData: FormData) {
    "use server";
    const ideaId = String(formData.get("idea_id") ?? "");
    const platform = String(formData.get("platform") ?? "instagram") as PublishPlatform;
    const platformPostId = String(formData.get("platform_post_id") ?? "").trim();
    const publishedAt = String(formData.get("published_at") ?? "");
    const contentType = String(formData.get("content_type") ?? "short_video").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!ideaId || !publishedAt) return;

    await createPublish({ ideaId, platform, platformPostId, publishedAt, contentType, url });
    await moveIdeaStatus(ideaId, "published");
    revalidatePath("/publishes");
    revalidatePath("/pipeline");
  }

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
            どのネタを、どこに、いつ投稿したかを記録して分析の起点を作ります。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">投稿を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreatePublish} className="grid gap-3 md:grid-cols-2">
            <select
              name="idea_id"
              required
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">ネタを選択</option>
              {ideas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <select
              name="platform"
              defaultValue="instagram"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <input
              name="published_at"
              type="datetime-local"
              required
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="platform_post_id"
              placeholder="投稿ID（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="content_type"
              defaultValue="short_video"
              placeholder="short_video"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="url"
              placeholder="投稿URL（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <div>
              <Button type="submit">投稿を保存</Button>
            </div>
          </form>
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
              {publishes.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <p className="font-medium">{row.ideas?.title ?? "（タイトルなし）"}</p>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>platform: {row.platform}</span>
                    <span>{new Date(row.published_at).toLocaleString("ja-JP")}</span>
                    <span>type: {row.content_type}</span>
                  </div>
                  {row.url ? (
                    <a href={row.url} className="mt-1 block text-xs text-primary underline" target="_blank" rel="noreferrer">
                      {row.url}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
