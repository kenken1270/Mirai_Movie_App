import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createMetricSnapshot,
  listMetricSnapshots,
  listPublishes,
} from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type PublishOption = {
  id: string;
  platform: string;
  ideas?: { title?: string } | null;
};

type SnapshotWithJoin = {
  id: string;
  publish_id: string;
  recorded_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avg_view_duration_sec: number | null;
  completion_rate: number | null;
  publishes?: { platform?: string; ideas?: { title?: string } | null } | null;
};

export default async function AnalyticsPage() {
  async function onCreateSnapshot(formData: FormData) {
    "use server";
    const publishId = String(formData.get("publish_id") ?? "");
    if (!publishId) return;

    const toNum = (key: string): number => Number(formData.get(key) ?? 0);
    const views = toNum("views");
    const likes = toNum("likes");
    const comments = toNum("comments");
    const shares = toNum("shares");
    const saves = toNum("saves");
    const avg = String(formData.get("avg_view_duration_sec") ?? "").trim();
    const completion = String(formData.get("completion_rate") ?? "").trim();

    await createMetricSnapshot({
      publishId,
      views,
      likes,
      comments,
      shares,
      saves,
      avgViewDurationSec: avg ? Number(avg) : null,
      completionRate: completion ? Number(completion) : null,
    });
    revalidatePath("/analytics");
  }

  const [{ data: publishData }, { data: snapshotData, error }] = await Promise.all([
    listPublishes(),
    listMetricSnapshots(),
  ]);
  const publishes = ((publishData ?? []) as PublishOption[]).map((p) => ({
    id: p.id,
    platform: p.platform,
    ideas: p.ideas,
  }));
  const snapshots = (snapshotData ?? []) as SnapshotWithJoin[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>分析ログ</CardTitle>
          <CardDescription>投稿の実績を時系列で記録し、次の意思決定に使います。</CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">指標を記録</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreateSnapshot} className="grid gap-3 md:grid-cols-4">
            <select
              name="publish_id"
              required
              className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-2"
            >
              <option value="">投稿を選択</option>
              {publishes.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.platform}] {item.ideas?.title ?? "（タイトルなし）"}
                </option>
              ))}
            </select>
            <input name="views" type="number" defaultValue={0} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="likes" type="number" defaultValue={0} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="comments" type="number" defaultValue={0} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="shares" type="number" defaultValue={0} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="saves" type="number" defaultValue={0} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input
              name="avg_view_duration_sec"
              type="number"
              step="0.01"
              placeholder="平均視聴秒数"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="completion_rate"
              type="number"
              step="0.001"
              placeholder="完了率(0-1)"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <div className="md:col-span-4">
              <Button type="submit">記録する</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最新ログ</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">分析ログはまだありません。</p>
          ) : (
            <div className="space-y-3">
              {snapshots.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <p className="font-medium">
                    [{row.publishes?.platform ?? "unknown"}] {row.publishes?.ideas?.title ?? "（タイトルなし）"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{new Date(row.recorded_at).toLocaleString("ja-JP")}</span>
                    <span>views {row.views}</span>
                    <span>likes {row.likes}</span>
                    <span>comments {row.comments}</span>
                    <span>shares {row.shares}</span>
                    <span>saves {row.saves}</span>
                    <span>avg {row.avg_view_duration_sec ?? "-"}</span>
                    <span>completion {row.completion_rate ?? "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
