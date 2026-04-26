import { revalidatePath } from "next/cache";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { draftScriptOnce } from "@/lib/ai/buzzword";
import {
  createScript,
  listBrandProfile,
  listPipelineIdeas,
  listScripts,
  updateScriptContent,
} from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type IdeaOption = {
  id: string;
  title: string;
  hook: string | null;
};

type ScriptRow = {
  id: string;
  idea_id: string;
  content: string;
  version: number;
  is_current: boolean;
  created_at: string;
  ideas?: { title?: string } | null;
};

function oneParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  async function onSaveManual(formData: FormData) {
    "use server";
    const ideaId = String(formData.get("idea_id") ?? "");
    const content = String(formData.get("content") ?? "").trim();
    if (!ideaId || !content) return;
    await createScript({ ideaId, content });
    revalidatePath("/scripts");
    revalidatePath("/pipeline");
    revalidatePath(`/ideas/${ideaId}`);
  }

  async function onAiDraft(formData: FormData) {
    "use server";
    const ideaId = String(formData.get("idea_id") ?? "");
    if (!ideaId) return;
    const ideaTitle = String(formData.get("idea_title") ?? "");
    const ideaHook = String(formData.get("idea_hook") ?? "");
    const targetAudience = String(formData.get("target_audience") ?? "");
    const platform = String(formData.get("platform") ?? "instagram");
    const durationSec = Number(formData.get("duration_sec") ?? 30);
    const goal = String(formData.get("goal") ?? "save");
    const toneOfVoice = String(formData.get("tone_of_voice") ?? "");
    const defaultCta = String(formData.get("default_cta") ?? "");
    const { data: brandRow } = await listBrandProfile();
    const businessSummary = String(formData.get("business_summary") ?? "").trim() || String(brandRow?.business_summary ?? "").trim();
    const scriptOsMarkdown = String(brandRow?.script_os_markdown ?? "");

    const draft = await draftScriptOnce({
      ideaId,
      ideaTitle,
      ideaHook,
      targetAudience,
      platform,
      durationSec,
      goal,
      toneOfVoice,
      defaultCta,
      businessSummary,
      scriptOsMarkdown,
    });
    await createScript({ ideaId, content: draft });
    revalidatePath("/scripts");
    revalidatePath("/pipeline");
    revalidatePath(`/ideas/${ideaId}`);
  }

  async function onUpdateScript(formData: FormData) {
    "use server";
    const id = String(formData.get("script_id") ?? "").trim();
    const content = String(formData.get("content") ?? "");
    if (!id) return;
    const ideaId = String(formData.get("idea_id") ?? "").trim();
    await updateScriptContent({ id, content });
    revalidatePath("/scripts");
    revalidatePath("/pipeline");
    if (ideaId) revalidatePath(`/ideas/${ideaId}`);
  }

  const [{ data: ideaData }, { data: scriptData }, { data: brand }] = await Promise.all([
    listPipelineIdeas(),
    listScripts(),
    listBrandProfile(),
  ]);
  const ideas = ((ideaData ?? []) as IdeaOption[]).filter((x) => x.title);
  const scripts = (scriptData ?? []) as ScriptRow[];
  const preselectedIdea = oneParam(searchParams.idea);

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>台本作成</CardTitle>
          <CardDescription>
            AIは1回の壁打ち生成に限定し、コストを抑えて台本下書きを作ります。ブランドの「台本OS」（ブランドページ）を最優先し、秒数・映像・セリフ・演出のMarkdown表形式で出力します。パイプラインの「台本へ」から来た場合、アイディアが自動で選ばれます。保存した台本の一覧・撮影用カンペ表示は{" "}
            <Link href="/script-library" className="font-medium text-primary underline-offset-2 hover:underline">
              台本保管庫
            </Link>
            から開けます。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">新しい台本</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2">
            <select
              name="idea_id"
              required
              defaultValue={preselectedIdea || undefined}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">アイディアを選択</option>
              {ideas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <input
              name="idea_title"
              placeholder="AI生成時用タイトル（選択と同じでOK）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="idea_hook"
              placeholder="フック（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            />
            <select
              name="platform"
              defaultValue={brand?.default_platform ?? "instagram"}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="xiaohongshu">小紅書（XHS）</option>
              <option value="note">Note</option>
            </select>
            <input
              name="duration_sec"
              type="number"
              defaultValue={brand?.default_duration_sec ?? 30}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="goal"
              defaultValue={brand?.default_goal ?? "save"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="target_audience"
              defaultValue={brand?.target_audience ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="tone_of_voice"
              defaultValue={brand?.tone_of_voice ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="default_cta"
              defaultValue={brand?.default_cta ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="business_summary"
              defaultValue=""
              placeholder="事業概要の上書き（空欄ならブランド設定を使用）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            />
            <textarea
              name="content"
              placeholder="手動で台本を書く場合はこちら"
              className="min-h-36 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" formAction={onSaveManual}>
                手動保存
              </Button>
              <Button type="submit" variant="outline" formAction={onAiDraft}>
                AI壁打ちで1本生成
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">台本ログ</CardTitle>
            <Link href="/pipeline" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              パイプライン・ネタ詳細へ
            </Link>
          </div>
          <CardDescription>
            現在版（is_current）は下のフォームで編集して保存できます。過去バージョンは参照のみです。新しい版を残す場合は上のフォームから「手動保存」で上書き版を作成してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">台本はまだありません。</p>
          ) : (
            scripts.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {row.ideas?.title ?? "（タイトルなし）"} / v{row.version}
                    {row.is_current ? (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        現在版
                      </span>
                    ) : (
                      <span className="ml-2 text-[10px] text-muted-foreground">履歴</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.is_current ? <CopyMarkdownButton markdown={row.content} /> : null}
                    <Link
                      href={`/ideas/${row.idea_id}`}
                      className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      ネタ詳細
                    </Link>
                  </div>
                </div>
                {row.is_current ? (
                  <form action={onUpdateScript} className="mt-2 space-y-2">
                    <input type="hidden" name="script_id" value={row.id} />
                    <input type="hidden" name="idea_id" value={row.idea_id} />
                    <textarea
                      name="content"
                      defaultValue={row.content}
                      className="min-h-48 w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      この版の内容を保存
                    </Button>
                  </form>
                ) : (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                    {row.content}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
