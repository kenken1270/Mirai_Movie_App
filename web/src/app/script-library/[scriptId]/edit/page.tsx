import Link from "next/link";
import { notFound } from "next/navigation";

import { ScriptStructuredForm } from "@/components/script-structured-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getScriptById } from "@/lib/repositories/loop-repository";
import { parseStructuredData } from "@/lib/script-structured";

export const dynamic = "force-dynamic";

export default async function ScriptStructuredEditPage({
  params,
  searchParams,
}: {
  params: { scriptId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { data: script, error } = await getScriptById(params.scriptId);

  if (error) {
    return (
      <div className="container mx-auto max-w-3xl p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/script-library" className="mt-4 inline-block text-sm text-primary underline">
          一覧へ
        </Link>
      </div>
    );
  }

  if (!script) {
    notFound();
  }

  const imported = String(searchParams.imported ?? "") === "1";
  const displayTitleFromDb = String((script as { display_title?: string | null }).display_title ?? "").trim();
  let structured = parseStructuredData((script as { structured_data?: unknown }).structured_data);
  if (!(script as { structured_data?: unknown }).structured_data && displayTitleFromDb) {
    structured = { ...structured, episode_label: structured.episode_label || displayTitleFromDb };
  }
  const initialDisplayTitle =
    displayTitleFromDb || structured.episode_label.trim() || "（無題）";

  const hasStructured = Boolean((script as { structured_data?: unknown }).structured_data);

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>台本の編集（構造化）</CardTitle>
          <CardDescription>
            表形式のブロックや一工夫メモを埋めて保存すると、保管庫・カンペ用の <strong>Markdown全文</strong>が自動更新されます。
          </CardDescription>
          {imported ? (
            <p className="text-sm text-emerald-600">第1回サンプルを取り込みました。必要に応じて追記・修正してください。</p>
          ) : null}
        </CardHeader>
      </Card>

      {!hasStructured && script.content ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">既存のMarkdown（参考）</CardTitle>
            <CardDescription>
              まだ構造化データがありません。下のフォームに内容を移して保存すると、Markdownが再生成されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs">
              {script.content}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <ScriptStructuredForm
            scriptId={script.id}
            initialDisplayTitle={initialDisplayTitle}
            initialData={structured}
            isCurrent={script.is_current}
          />
        </CardContent>
      </Card>
    </div>
  );
}
