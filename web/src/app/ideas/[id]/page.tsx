import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { publishPlatformLabelJa } from "@/lib/publish-platform-label";
import {
  createIdeaAsset,
  deleteIdeaAsset,
  getIdeaById,
  listAiLogsForIdea,
  listIdeaAssets,
  listMetricSnapshotsForIdea,
  listPublishesByIdea,
  listScriptsByIdea,
  moveIdeaStatus,
  updateIdea,
} from "@/lib/repositories/loop-repository";
import type { IdeaStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

const STAGES: IdeaStatus[] = [
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

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CHECK_KEYS = ["hook", "subtitles", "thumbnail", "bgm", "cta"] as const;
const CHECK_LABELS: Record<(typeof CHECK_KEYS)[number], string> = {
  hook: "冒頭フック（3秒）",
  subtitles: "字幕（日中など）",
  thumbnail: "表紙・サムネ",
  bgm: "BGM",
  cta: "CTA・導線",
};

function normalizeChecklist(raw: unknown): Record<string, boolean> {
  const base: Record<string, boolean> = {
    hook: false,
    subtitles: false,
    thumbnail: false,
    bgm: false,
    cta: false,
  };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of CHECK_KEYS) {
      if (k in raw && typeof (raw as Record<string, unknown>)[k] === "boolean") {
        base[k] = (raw as Record<string, boolean>)[k];
      }
    }
  }
  return base;
}

function parseTags(s: string): string[] {
  return s
    .split(/[,、]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default async function IdeaDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;

  async function onUpdateMeta(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const hook = String(formData.get("hook") ?? "").trim();
    const sourceNote = String(formData.get("source_note") ?? "").trim();
    const tags = parseTags(String(formData.get("tags") ?? ""));
    const filming = String(formData.get("scheduled_filming_at") ?? "").trim();
    const publish = String(formData.get("scheduled_publish_at") ?? "").trim();
    if (!title) return;
    await updateIdea({
      id,
      title,
      hook: hook || null,
      sourceNote: sourceNote || null,
      tags,
      scheduledFilmingAt: filming ? new Date(filming).toISOString() : null,
      scheduledPublishAt: publish ? new Date(publish).toISOString() : null,
    });
    revalidatePath(`/ideas/${id}`);
    revalidatePath("/pipeline");
    revalidatePath("/weekly");
  }

  async function onUpdateStatus(formData: FormData) {
    "use server";
    const status = String(formData.get("status") ?? "") as IdeaStatus;
    if (!STAGES.includes(status)) return;
    await moveIdeaStatus(id, status);
    revalidatePath(`/ideas/${id}`);
    revalidatePath("/pipeline");
    revalidatePath("/weekly");
  }

  async function onUpdateChecklist(formData: FormData) {
    "use server";
    const checklist: Record<string, boolean> = {};
    for (const k of CHECK_KEYS) {
      checklist[k] = formData.get(k) === "on";
    }
    await updateIdea({ id, productionChecklist: checklist });
    revalidatePath(`/ideas/${id}`);
    revalidatePath("/pipeline");
  }

  async function onAddAsset(formData: FormData) {
    "use server";
    const label = String(formData.get("label") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!url) return;
    await createIdeaAsset({ ideaId: id, label, url });
    revalidatePath(`/ideas/${id}`);
  }

  async function onDeleteAsset(formData: FormData) {
    "use server";
    const assetId = String(formData.get("asset_id") ?? "").trim();
    if (!assetId) return;
    await deleteIdeaAsset(assetId);
    revalidatePath(`/ideas/${id}`);
  }

  const { data: idea, error } = await getIdeaById(id);
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <p className="text-sm text-destructive">読み込みに失敗しました: {error}</p>
        <Link href="/pipeline" className="mt-4 inline-block text-sm text-primary underline">
          パイプラインへ戻る
        </Link>
      </div>
    );
  }
  if (!idea) {
    notFound();
  }

  const [
    { data: scripts },
    { data: publishes },
    { data: metrics },
    { data: assets },
    { data: aiLogs },
  ] = await Promise.all([
    listScriptsByIdea(id),
    listPublishesByIdea(id),
    listMetricSnapshotsForIdea(id),
    listIdeaAssets(id),
    listAiLogsForIdea(id),
  ]);

  const hypothesis = idea.hypotheses as { title?: string; problem_statement?: string; hook_hypothesis?: string } | null;
  const checklist = normalizeChecklist(idea.production_checklist);
  const tagStr = Array.isArray(idea.tags) ? (idea.tags as string[]).join(", ") : "";

  const currentScript = (scripts ?? []).find((s: { is_current?: boolean }) => s.is_current);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/pipeline" className="underline-offset-2 hover:underline">
              パイプライン
            </Link>
            {" · "}
            <Link href="/weekly" className="underline-offset-2 hover:underline">
              今週のフォーカス
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{idea.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">仮説: {hypothesis?.title ?? "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/scripts?idea=${id}`}>
            <Button type="button" variant="default" size="sm">
              台本ページを開く
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報・工程</CardTitle>
          <CardDescription>タイトル・フック・タグ・予定日・メモをまとめて更新します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={onUpdateStatus} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">工程:</span>
            <select
              name="status"
              defaultValue={idea.status}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              工程を保存
            </Button>
          </form>

          <form action={onUpdateMeta} className="grid gap-3">
            <input
              name="title"
              required
              defaultValue={idea.title}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="hook"
              defaultValue={idea.hook ?? ""}
              placeholder="フック"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="tags"
              defaultValue={tagStr}
              placeholder="タグ（カンマ区切り: 逆説フック, 60秒, RED）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">撮影予定</label>
                <input
                  name="scheduled_filming_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(
                    (idea as { scheduled_filming_at?: string | null }).scheduled_filming_at ?? null,
                  )}
                  className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">公開予定</label>
                <input
                  name="scheduled_publish_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(
                    (idea as { scheduled_publish_at?: string | null }).scheduled_publish_at ?? null,
                  )}
                  className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <textarea
              name="source_note"
              defaultValue={idea.source_note ?? ""}
              placeholder="制作メモ（任意）"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm"
            />
            <Button type="submit" size="sm">
              基本情報を保存
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">仮説コンテキスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">課題: </span>
            {hypothesis?.problem_statement ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">フック仮説: </span>
            {hypothesis?.hook_hypothesis ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">公開前チェックリスト</CardTitle>
          <CardDescription>台本OSに沿った最終確認用（保存はまとめて1回）。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onUpdateChecklist} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECK_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={k} value="on" defaultChecked={checklist[k]} className="rounded border-input" />
                  {CHECK_LABELS[k]}
                </label>
              ))}
            </div>
            <Button type="submit" size="sm" variant="secondary">
              チェック状態を保存
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">素材・リンク</CardTitle>
          <CardDescription>表紙案URL、参考動画、ドライブリンクなど（テキストURLのみ）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={onAddAsset} className="flex flex-wrap gap-2">
            <input name="label" placeholder="ラベル（任意）" className="h-9 flex-1 min-w-[120px] rounded-md border border-input bg-background px-3 text-sm" />
            <input name="url" placeholder="https://..." required className="h-9 flex-[2] min-w-[180px] rounded-md border border-input bg-background px-3 text-sm" />
            <Button type="submit" size="sm">
              追加
            </Button>
          </form>
          {(assets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">リンクはまだありません。</p>
          ) : (
            <ul className="space-y-2">
              {(assets ?? []).map((a: { id: string; label: string | null; url: string }) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                  <div>
                    {a.label ? <span className="font-medium">{a.label}: </span> : null}
                    <a href={a.url} className="text-primary underline break-all" target="_blank" rel="noreferrer">
                      {a.url}
                    </a>
                  </div>
                  <form action={onDeleteAsset}>
                    <input type="hidden" name="asset_id" value={a.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      削除
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">台本</CardTitle>
            {currentScript ? (
              <CopyMarkdownButton markdown={currentScript.content as string} label="現在版をコピー" />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(scripts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">台本がありません。台本ページから作成してください。</p>
          ) : (
            (scripts ?? []).map((s: { id: string; version: number; is_current: boolean; content: string }) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    v{s.version}
                    {s.is_current ? " · 現在版" : " · 履歴"}
                  </p>
                  <Link
                    href={`/script-library/${s.id}`}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    カンペ表示
                  </Link>
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs">{s.content}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">投稿・指標</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(publishes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">投稿記録がありません。投稿ページから紐づけて登録すると、工程が「投稿済み」に揃います。</p>
          ) : (
            <ul className="space-y-2">
              {(publishes ?? []).map(
                (p: {
                  id: string;
                  platform: string;
                  published_at: string;
                  url: string | null;
                }) => (
                  <li key={p.id} className="rounded border px-3 py-2 text-sm">
                    <span className="font-medium">[{publishPlatformLabelJa(p.platform)}]</span>{" "}
                    {new Date(p.published_at).toLocaleString("ja-JP")}
                    {p.url ? (
                      <a href={p.url} className="ml-2 text-primary underline" target="_blank" rel="noreferrer">
                        リンク
                      </a>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          )}
          {(metrics ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">このネタに紐づく指標スナップショットはまだありません。</p>
          ) : (
            <div className="space-y-2">
              {(metrics ?? []).map((m: Record<string, unknown>) => {
                const pub = m.publishes as { platform?: string } | { platform?: string }[] | null | undefined;
                const platform =
                  Array.isArray(pub) ? pub[0]?.platform : pub?.platform;
                return (
                  <div key={String(m.id)} className="rounded border px-3 py-2 text-xs text-muted-foreground">
                    {new Date(String(m.recorded_at)).toLocaleString("ja-JP")} · [
                    {publishPlatformLabelJa(String(platform ?? "?"))}] · views{" "}
                    {Number(m.views)} · saves {Number(m.saves)}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 生成ログ</CardTitle>
          <CardDescription>台本の壁打ち実行ごとにプロンプト要約を残します（コスト把握・再現用）。</CardDescription>
        </CardHeader>
        <CardContent>
          {(aiLogs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">ログはまだありません。</p>
          ) : (
            <ul className="space-y-3">
              {(aiLogs ?? []).map(
                (log: { id: string; kind: string; model: string | null; created_at: string; prompt_summary: string | null }) => (
                  <li key={log.id} className="rounded border p-3 text-xs">
                    <p className="font-medium text-foreground">
                      {log.kind} {log.model ? `· ${log.model}` : ""}
                    </p>
                    <p className="text-muted-foreground">{new Date(log.created_at).toLocaleString("ja-JP")}</p>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                      {log.prompt_summary}
                    </pre>
                  </li>
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
