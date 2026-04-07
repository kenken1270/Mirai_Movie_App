import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brainstormBuzzwords } from "@/lib/ai/buzzword";
import {
  createBuzzword,
  createNeedResearch,
  listBuzzwords,
  listNeedResearches,
} from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

function parseLines(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function NeedsResearchPage() {
  async function onSaveManual(formData: FormData) {
    "use server";
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) return;
    const audience = String(formData.get("audience") ?? "").trim();
    const painPoint = String(formData.get("pain_point") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const keywordLines = parseLines(String(formData.get("keywords") ?? ""));

    const result = await createNeedResearch({
      topic,
      audience,
      painPoint,
      notes,
      source: "manual",
    });
    for (const word of keywordLines) {
      await createBuzzword({
        keyword: word,
        context: notes,
        priority: 3,
        source: "manual",
        needResearchId: result.data?.id,
      });
    }
    revalidatePath("/needs-research");
  }

  async function onAiBrainstorm(formData: FormData) {
    "use server";
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) return;
    const audience = String(formData.get("audience") ?? "").trim();
    const painPoint = String(formData.get("pain_point") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const result = await createNeedResearch({
      topic,
      audience,
      painPoint,
      notes,
      source: "ai",
    });
    const words = await brainstormBuzzwords({ topic, audience, painPoint });
    for (const word of words) {
      await createBuzzword({
        keyword: word,
        context: notes || `${topic} / ${audience}`,
        priority: 4,
        source: "gemini",
        needResearchId: result.data?.id,
      });
    }
    revalidatePath("/needs-research");
  }

  const [{ data: researchData }, { data: buzzData }] = await Promise.all([
    listNeedResearches(),
    listBuzzwords(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ニーズ探索</CardTitle>
          <CardDescription>
            ターゲットの悩みを整理し、バズワードへ落とし込むページです。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">探索入力</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2">
            <input name="topic" required placeholder="テーマ" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="audience" placeholder="対象" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input
              name="pain_point"
              placeholder="悩み（例: 何を投稿すればいいかわからない）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            />
            <textarea
              name="notes"
              placeholder="メモ"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <textarea
              name="keywords"
              placeholder={"手入力バズワード（1行1ワード）\n例: 勉強法\n例: 定期テスト"}
              className="min-h-28 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" formAction={onSaveManual}>
                手入力で保存
              </Button>
              <Button type="submit" variant="outline" formAction={onAiBrainstorm}>
                AI壁打ちでバズワード作成（1回）
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">探索ログ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(researchData ?? []).length === 0 ? (
              <p className="text-muted-foreground">まだありません。</p>
            ) : (
              (researchData ?? []).map((row: { id: string; topic: string; audience: string | null; created_at: string }) => (
                <div key={row.id} className="rounded border p-2">
                  <p className="font-medium">{row.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.audience ?? "対象未設定"} / {new Date(row.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">バズワード一覧</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(buzzData ?? []).length === 0 ? (
              <p className="text-muted-foreground">まだありません。</p>
            ) : (
              (buzzData ?? []).map((row: { id: string; keyword: string; priority: number; source: string }) => (
                <div key={row.id} className="rounded border p-2">
                  <p className="font-medium">{row.keyword}</p>
                  <p className="text-xs text-muted-foreground">
                    priority: {row.priority} / source: {row.source}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
