import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateNextIdeaSuggestions } from "@/lib/ai/gemini";
import {
  listMetricSnapshots,
  listPipelineIdeas,
  listRetrospectives,
} from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type SnapshotRow = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishes?: { platform?: string; ideas?: { title?: string } | null } | null;
};

type RetrospectiveRow = {
  what_failed: string | null;
  next_action: string;
};

type IdeaRow = {
  id: string;
  title: string;
  status: string;
  hypotheses?: { title?: string } | null;
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function failureTags(items: RetrospectiveRow[]): string[] {
  const source = items.map((x) => (x.what_failed ?? "").toLowerCase()).join(" ");
  const tags = [
    { key: "hook", words: ["フック", "冒頭", "hook"] },
    { key: "cta", words: ["cta", "行動喚起"] },
    { key: "length", words: ["長い", "短い", "尺", "テンポ"] },
    { key: "value", words: ["価値", "具体", "抽象"] },
  ];
  return tags.filter((t) => t.words.some((w) => source.includes(w))).map((t) => t.key);
}

export default async function NextActionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [{ data: metricData }, { data: retroData }, { data: ideaData }] = await Promise.all([
    listMetricSnapshots(),
    listRetrospectives(),
    listPipelineIdeas(),
  ]);

  const metrics = (metricData ?? []) as SnapshotRow[];
  const retros = (retroData ?? []) as RetrospectiveRow[];
  const ideas = (ideaData ?? []) as IdeaRow[];

  const ranked = metrics
    .map((m) => {
      const score = m.saves * 3 + m.shares * 2 + m.comments + m.likes * 0.3;
      return { ...m, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const tags = failureTags(retros);
  const backlogCount = ideas.filter((i) => i.status === "backlog").length;
  const writingCount = ideas.filter((i) => i.status === "writing").length;

  const actions: string[] = [];
  if (best?.publishes?.ideas?.title) {
    actions.push(
      `直近で反応が高い「${best.publishes.ideas.title}」の型を1本リメイクする（同テーマで別フック）`
    );
  }
  if (tags.includes("hook")) actions.push("冒頭3秒のフック案を3パターン作ってA/B比較する");
  if (tags.includes("cta")) actions.push("台本末尾のCTAを1つに絞り、保存/コメント誘導を明確化する");
  if (tags.includes("length")) actions.push("動画尺を短縮し、1メッセージ1動画に分割して検証する");
  if (tags.includes("value")) actions.push("抽象説明を減らし、具体例を1つ追加して再投稿する");
  if (backlogCount < 3) actions.push("仮説ボードから新規ネタを3件補充する");
  if (writingCount > 3) actions.push("台本待ちが滞留中。今週は撮影より台本完了を優先する");
  if (actions.length === 0) actions.push("データがまだ少ないため、まず投稿3本 + 振り返り3件を蓄積する");

  const shouldGenerate = one(searchParams.ai) === "1";
  const aiSuggestions = shouldGenerate
    ? await generateNextIdeaSuggestions({
        bestTitle: best?.publishes?.ideas?.title ?? null,
        topSignals: best
          ? `saves=${best.saves}, shares=${best.shares}, comments=${best.comments}, likes=${best.likes}`
          : "no top post",
        failureTags: tags,
        backlogCount,
        writingCount,
        recentNextActions: retros.slice(0, 5).map((r) => r.next_action),
      })
    : [];

  return (
    <div className="container mx-auto max-w-6xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>次の一手</CardTitle>
          <CardDescription>
            投稿実績と振り返りログから、次にやるべきアクションを自動提案します。
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">直近の強い投稿</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {best ? (
              <div className="space-y-1">
                <p className="font-medium">{best.publishes?.ideas?.title ?? "（タイトルなし）"}</p>
                <p className="text-muted-foreground">
                  saves: {best.saves} / shares: {best.shares} / comments: {best.comments}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">分析ログがまだありません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ボトルネック</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>backlog: {backlogCount}件 / writing: {writingCount}件</p>
            <p className="text-muted-foreground">失敗タグ: {tags.length ? tags.join(", ") : "未検出"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">推奨アクション</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {actions.map((item, idx) => (
              <li key={`${idx}-${item}`}>{item}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">AI提案（Gemini）</CardTitle>
              <CardDescription>
                実績ログから次に作る動画ネタ3案を生成します。
              </CardDescription>
            </div>
            <Link href="/next-actions?ai=1">
              <Button type="button" variant="outline">
                AIで3案生成
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!shouldGenerate ? (
            <p className="text-sm text-muted-foreground">
              「AIで3案生成」を押すと、Geminiから提案を取得します。
            </p>
          ) : (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {aiSuggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
