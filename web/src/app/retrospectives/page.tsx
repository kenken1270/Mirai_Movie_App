import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publishEntryTitle, publishPlatformLabelJa } from "@/lib/publish-platform-label";
import {
  createRetrospective,
  listHypotheses,
  listPublishes,
  listRetrospectives,
} from "@/lib/repositories/loop-repository";
import type { HypothesisRow } from "@/types/domain";

export const dynamic = "force-dynamic";

type PublishOption = {
  id: string;
  platform: string;
  title?: string | null;
  idea_id?: string | null;
  ideas?: { title?: string } | null;
};

type RetrospectiveWithJoin = {
  id: string;
  summary: string;
  what_worked: string | null;
  what_failed: string | null;
  next_action: string;
  created_at: string;
  hypotheses?: { title?: string } | null;
  publishes?: {
    platform?: string;
    title?: string | null;
    idea_id?: string | null;
    ideas?: { title?: string } | null;
  } | null;
};

export default async function RetrospectivesPage() {
  async function onCreate(formData: FormData) {
    "use server";
    const hypothesisId = String(formData.get("hypothesis_id") ?? "");
    const publishId = String(formData.get("publish_id") ?? "");
    const summary = String(formData.get("summary") ?? "").trim();
    const whatWorked = String(formData.get("what_worked") ?? "").trim();
    const whatFailed = String(formData.get("what_failed") ?? "").trim();
    const nextAction = String(formData.get("next_action") ?? "").trim();
    if (!hypothesisId || !summary || !nextAction) return;

    await createRetrospective({
      hypothesisId,
      publishId,
      summary,
      whatWorked,
      whatFailed,
      nextAction,
    });
    revalidatePath("/retrospectives");
  }

  const [{ data: hypothesisData }, { data: publishData }, { data: retrospectiveData, error }] =
    await Promise.all([listHypotheses(), listPublishes(), listRetrospectives()]);
  const hypotheses = (hypothesisData ?? []) as HypothesisRow[];
  const publishes = (publishData ?? []) as PublishOption[];
  const retrospectives = (retrospectiveData ?? []) as RetrospectiveWithJoin[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>振り返り</CardTitle>
          <CardDescription>
            成果の理由と改善点を構造化して、次ネタの精度を上げるための記録です。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">振り返りを追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="grid gap-3 md:grid-cols-2">
            <select
              name="hypothesis_id"
              required
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">仮説を選択</option>
              {hypotheses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <select
              name="publish_id"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">投稿（任意）</option>
              {publishes.map((item) => (
                <option key={item.id} value={item.id}>
                  [{publishPlatformLabelJa(item.platform)}] {publishEntryTitle(item)}
                </option>
              ))}
            </select>
            <textarea
              name="summary"
              required
              placeholder="今回の評価まとめ（必須）"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <textarea
              name="what_worked"
              placeholder="うまくいった要因"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm"
            />
            <textarea
              name="what_failed"
              placeholder="うまくいかなかった要因"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm"
            />
            <textarea
              name="next_action"
              required
              placeholder="次にやる具体アクション（必須）"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <div>
              <Button type="submit">保存する</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">振り返りログ</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {retrospectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">振り返りはまだありません。</p>
          ) : (
            <div className="space-y-3">
              {retrospectives.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <p className="font-medium">{row.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    仮説: {row.hypotheses?.title ?? "（なし）"} / 投稿:{" "}
                    {row.publishes
                      ? `${publishPlatformLabelJa(String(row.publishes.platform ?? "?"))} · ${publishEntryTitle({
                          ideas: row.publishes.ideas ?? null,
                          title: row.publishes.title ?? null,
                          idea_id: row.publishes.idea_id ?? null,
                        })}`
                      : "未紐づけ"}
                  </p>
                  {row.what_worked ? (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">良かった点:</span> {row.what_worked}
                    </p>
                  ) : null}
                  {row.what_failed ? (
                    <p className="mt-1 text-sm">
                      <span className="font-medium">課題:</span> {row.what_failed}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm">
                    <span className="font-medium">次アクション:</span> {row.next_action}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
