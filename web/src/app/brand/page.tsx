import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listBrandProfile, upsertBrandProfile } from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function BrandPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  async function onSave(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    await upsertBrandProfile({
      id: id || undefined,
      name,
      businessSummary: String(formData.get("business_summary") ?? "").trim(),
      targetAudience: String(formData.get("target_audience") ?? "").trim(),
      valueProposition: String(formData.get("value_proposition") ?? "").trim(),
      toneOfVoice: String(formData.get("tone_of_voice") ?? "").trim(),
      defaultPlatform: String(formData.get("default_platform") ?? "instagram").trim(),
      defaultDurationSec: Number(formData.get("default_duration_sec") ?? 30),
      defaultGoal: String(formData.get("default_goal") ?? "save").trim(),
      defaultCta: String(formData.get("default_cta") ?? "").trim(),
    });
    revalidatePath("/brand");
    redirect("/brand?saved=1");
  }

  const { data } = await listBrandProfile();
  const saved = one(searchParams.saved) === "1";

  return (
    <div className="container mx-auto max-w-5xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>ブランド前提設定</CardTitle>
          <CardDescription>
            毎回同じ入力を省き、AI台本の品質を安定させるための共通設定です。
          </CardDescription>
          {saved ? (
            <p className="text-xs text-emerald-600">保存しました。</p>
          ) : null}
          {data?.updated_at ? (
            <p className="text-xs text-muted-foreground">
              最終更新: {new Date(data.updated_at).toLocaleString("ja-JP")}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form action={onSave} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={data?.id ?? ""} />
            <input
              name="name"
              required
              defaultValue={data?.name ?? "未来塾"}
              placeholder="ブランド名"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="target_audience"
              defaultValue={data?.target_audience ?? ""}
              placeholder="ターゲット（例: 中高生・保護者）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              name="business_summary"
              defaultValue={data?.business_summary ?? ""}
              placeholder="どんな事業か"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <textarea
              name="value_proposition"
              defaultValue={data?.value_proposition ?? ""}
              placeholder="提供価値"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm"
            />
            <textarea
              name="tone_of_voice"
              defaultValue={data?.tone_of_voice ?? ""}
              placeholder="発信トーン"
              className="min-h-20 rounded-md border border-input bg-background p-3 text-sm"
            />
            <input
              name="default_platform"
              defaultValue={data?.default_platform ?? "instagram"}
              placeholder="既定プラットフォーム"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="default_duration_sec"
              type="number"
              defaultValue={data?.default_duration_sec ?? 30}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="default_goal"
              defaultValue={data?.default_goal ?? "save"}
              placeholder="既定目標"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="default_cta"
              defaultValue={data?.default_cta ?? ""}
              placeholder="既定CTA"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                保存
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
