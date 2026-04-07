import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createIdea,
  listBuzzwords,
  listHypotheses,
  listPipelineIdeas,
  moveIdeaStatus,
} from "@/lib/repositories/loop-repository";
import type { HypothesisRow, IdeaRow, IdeaStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

type IdeaWithHypothesis = IdeaRow & { hypotheses?: { title?: string } | null };

const stages: IdeaStatus[] = [
  "backlog",
  "writing",
  "recording",
  "editing",
  "scheduled",
  "published",
  "dropped",
];

function stageLabel(stage: IdeaStatus): string {
  const map: Record<IdeaStatus, string> = {
    backlog: "ネタ",
    writing: "台本",
    recording: "撮影",
    editing: "編集",
    scheduled: "投稿予約",
    published: "投稿済み",
    dropped: "保留/停止",
  };
  return map[stage];
}

export default async function PipelinePage() {
  async function onCreateIdea(formData: FormData) {
    "use server";
    const hypothesisId = String(formData.get("hypothesis_id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const hook = String(formData.get("hook") ?? "").trim();
    const status = String(formData.get("status") ?? "backlog") as IdeaStatus;
    const buzzwordId = String(formData.get("buzzword_id") ?? "").trim();
    const sourceNote = String(formData.get("source_note") ?? "").trim();
    if (!hypothesisId || !title) return;
    await createIdea({ hypothesisId, title, hook, status, buzzwordId, sourceNote });
    revalidatePath("/pipeline");
  }

  async function onMoveStage(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "backlog") as IdeaStatus;
    if (!id) return;
    await moveIdeaStatus(id, status);
    revalidatePath("/pipeline");
  }

  const [{ data: hypothesesData }, { data: ideasData, error }, { data: buzzwordsData }] = await Promise.all([
    listHypotheses(),
    listPipelineIdeas(),
    listBuzzwords(),
  ]);
  const hypotheses = (hypothesesData ?? []) as HypothesisRow[];
  const ideas = (ideasData ?? []) as IdeaWithHypothesis[];
  const buzzwords = (buzzwordsData ?? []) as Array<{ id: string; keyword: string }>;

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>制作パイプライン</CardTitle>
          <CardDescription>
            仮説から派生したネタを制作工程で管理し、投稿まで進めます。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">新しいネタを追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreateIdea} className="grid gap-3 md:grid-cols-[260px_1fr_1fr_160px_auto]">
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
            <input
              name="title"
              required
              placeholder="ネタタイトル"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="hook"
              placeholder="フック（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              name="buzzword_id"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">バズワード（任意）</option>
              {buzzwords.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.keyword}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue="backlog"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabel(stage)}
                </option>
              ))}
            </select>
            <input
              name="source_note"
              placeholder="メモ（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            />
            <Button type="submit">追加</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">パイプライン一覧</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">ネタがありません。先に仮説を作って追加してください。</p>
          ) : (
            <div className="space-y-3">
              {ideas.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.title}</p>
                    <form action={onMoveStage} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {stages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stageLabel(stage)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        移動
                      </Button>
                    </form>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    仮説: {row.hypotheses?.title ?? "（参照なし）"}
                  </p>
                  {row.hook ? <p className="mt-1 text-sm text-muted-foreground">{row.hook}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
