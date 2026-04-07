import { revalidatePath } from "next/cache";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createIdea,
  listBuzzwords,
  listHypotheses,
  listPipelineIdeas,
  listScripts,
  moveIdeaStatus,
} from "@/lib/repositories/loop-repository";
import type { HypothesisRow, IdeaRow, IdeaStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

type IdeaWithHypothesis = IdeaRow & {
  hypotheses?: { title?: string } | null;
  tags?: string[] | null;
  scheduled_filming_at?: string | null;
  scheduled_publish_at?: string | null;
};

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
    revalidatePath("/weekly");
  }

  async function onMoveStage(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "backlog") as IdeaStatus;
    if (!id) return;
    await moveIdeaStatus(id, status);
    revalidatePath("/pipeline");
    revalidatePath("/weekly");
    revalidatePath(`/ideas/${id}`);
  }

  const [{ data: hypothesesData }, { data: ideasData, error }, { data: buzzwordsData }, { data: scriptsData }] =
    await Promise.all([listHypotheses(), listPipelineIdeas(), listBuzzwords(), listScripts()]);
  const hypotheses = (hypothesesData ?? []) as HypothesisRow[];
  const ideas = (ideasData ?? []) as IdeaWithHypothesis[];
  const buzzwords = (buzzwordsData ?? []) as Array<{ id: string; keyword: string }>;
  const ideasWithCurrentScript = new Set(
    (scriptsData ?? [])
      .filter((s: { is_current?: boolean; idea_id?: string }) => s.is_current && s.idea_id)
      .map((s: { idea_id: string }) => s.idea_id),
  );

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>制作パイプライン</CardTitle>
          <CardDescription>
            仮説から派生したネタを制作工程で管理し、投稿まで進めます。下のボードで工程ごとの位置が一望できます。「ネタ詳細」で予定日・タグ・チェックリスト・素材URLをまとめて管理できます。
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">制作フロー（カンバン）</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
          {!error ? (
            <CardDescription>左から右へ進むイメージ。カード内で工程を変更するか、台本ページへジャンプできます。</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto pb-2">
          {ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">ネタがありません。先に仮説を作って追加してください。</p>
          ) : (
            <div className="flex min-h-[280px] gap-3 pb-1">
              {stages.map((stage) => {
                const columnIdeas = ideas.filter((i) => i.status === stage);
                return (
                  <div
                    key={stage}
                    className="flex w-64 shrink-0 flex-col rounded-lg border bg-muted/30"
                  >
                    <div className="border-b bg-muted/50 px-3 py-2">
                      <p className="text-xs font-semibold">{stageLabel(stage)}</p>
                      <p className="text-[10px] text-muted-foreground">{columnIdeas.length} 件</p>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-2">
                      {columnIdeas.length === 0 ? (
                        <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">なし</p>
                      ) : (
                        columnIdeas.map((row) => (
                          <div key={row.id} className="rounded-md border bg-background p-2 shadow-sm">
                            <p className="text-sm font-medium leading-snug">{row.title}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                              仮説: {row.hypotheses?.title ?? "—"}
                            </p>
                            {row.hook ? (
                              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{row.hook}</p>
                            ) : null}
                            {row.scheduled_filming_at || row.scheduled_publish_at ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {row.scheduled_filming_at
                                  ? `撮影 ${new Date(row.scheduled_filming_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                                  : null}
                                {row.scheduled_filming_at && row.scheduled_publish_at ? " · " : null}
                                {row.scheduled_publish_at
                                  ? `公開 ${new Date(row.scheduled_publish_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                                  : null}
                              </p>
                            ) : null}
                            {row.tags && row.tags.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-0.5">
                                {row.tags.slice(0, 4).map((t) => (
                                  <span
                                    key={t}
                                    className="rounded bg-background/80 px-1 py-0 text-[9px] text-muted-foreground ring-1 ring-border"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {ideasWithCurrentScript.has(row.id) ? (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                                  台本あり
                                </span>
                              ) : (
                                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-900 dark:text-amber-200">
                                  台本なし
                                </span>
                              )}
                              <Link
                                href={`/ideas/${row.id}`}
                                className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                              >
                                詳細
                              </Link>
                              <Link
                                href={`/scripts?idea=${row.id}`}
                                className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                              >
                                台本へ
                              </Link>
                            </div>
                            <form action={onMoveStage} className="mt-2 flex items-center gap-1">
                              <input type="hidden" name="id" value={row.id} />
                              <select
                                name="status"
                                defaultValue={row.status}
                                className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1 text-[10px]"
                              >
                                {stages.map((s) => (
                                  <option key={s} value={s}>
                                    {stageLabel(s)}
                                  </option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" variant="secondary" className="h-7 shrink-0 px-2 text-[10px]">
                                更新
                              </Button>
                            </form>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">一覧（日付順）</CardTitle>
          <CardDescription>作成が新しい順です。詳細メモの確認や一括把握に使えます。</CardDescription>
        </CardHeader>
        <CardContent>
          {ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">ネタがありません。</p>
          ) : (
            <div className="space-y-3">
              {ideas.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.title}</p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {stageLabel(row.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/ideas/${row.id}`}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        ネタ詳細
                      </Link>
                      <Link
                        href={`/scripts?idea=${row.id}`}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        台本を開く
                      </Link>
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
