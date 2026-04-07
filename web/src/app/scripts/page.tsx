import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { draftScriptOnce } from "@/lib/ai/buzzword";
import {
  createScript,
  listBrandProfile,
  listPipelineIdeas,
  listScripts,
} from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type IdeaOption = {
  id: string;
  title: string;
  hook: string | null;
};

type ScriptRow = {
  id: string;
  content: string;
  version: number;
  created_at: string;
  ideas?: { title?: string } | null;
};

export default async function ScriptsPage() {
  async function onSaveManual(formData: FormData) {
    "use server";
    const ideaId = String(formData.get("idea_id") ?? "");
    const content = String(formData.get("content") ?? "").trim();
    if (!ideaId || !content) return;
    await createScript({ ideaId, content });
    revalidatePath("/scripts");
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
    const businessSummary = String(formData.get("business_summary") ?? "");

    const draft = await draftScriptOnce({
      ideaTitle,
      ideaHook,
      targetAudience,
      platform,
      durationSec,
      goal,
      toneOfVoice,
      defaultCta,
      businessSummary,
    });
    await createScript({ ideaId, content: draft });
    revalidatePath("/scripts");
  }

  const [{ data: ideaData }, { data: scriptData }, { data: brand }] = await Promise.all([
    listPipelineIdeas(),
    listScripts(),
    listBrandProfile(),
  ]);
  const ideas = ((ideaData ?? []) as IdeaOption[]).filter((x) => x.title);
  const scripts = (scriptData ?? []) as ScriptRow[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>台本作成</CardTitle>
          <CardDescription>
            AIは1回の壁打ち生成に限定し、コストを抑えて台本下書きを作ります。
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
            <input
              name="platform"
              defaultValue={brand?.default_platform ?? "instagram"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
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
            <input type="hidden" name="business_summary" value={brand?.business_summary ?? ""} />
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
          <CardTitle className="text-base">台本ログ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">台本はまだありません。</p>
          ) : (
            scripts.map((row) => (
              <div key={row.id} className="rounded border p-3">
                <p className="text-sm font-medium">
                  {row.ideas?.title ?? "（タイトルなし）"} / v{row.version}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{row.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
