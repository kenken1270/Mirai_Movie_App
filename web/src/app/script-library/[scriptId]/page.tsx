import Link from "next/link";
import { notFound } from "next/navigation";

import { ScriptTeleprompterView } from "@/components/script-teleprompter";
import { getScriptById } from "@/lib/repositories/loop-repository";
import {
  buildCueOnlyText,
  hasProductionMetaContent,
  parseStructuredData,
} from "@/lib/script-structured";

export const dynamic = "force-dynamic";

function resolveIdeaTitle(ideas: unknown): string {
  if (!ideas) return "（タイトルなし）";
  if (Array.isArray(ideas)) {
    const first = ideas[0] as { title?: string } | undefined;
    return first?.title ?? "（タイトルなし）";
  }
  if (typeof ideas === "object" && ideas !== null && "title" in ideas) {
    return String((ideas as { title?: string }).title ?? "（タイトルなし）");
  }
  return "（タイトルなし）";
}

export default async function ScriptLibraryCuePage({ params }: { params: { scriptId: string } }) {
  const { data: script, error } = await getScriptById(params.scriptId);

  if (error) {
    return (
      <div className="container mx-auto max-w-lg p-8">
        <p className="text-sm text-destructive">読み込みに失敗しました: {error}</p>
        <Link href="/script-library" className="mt-4 inline-block text-sm text-primary underline">
          台本保管庫に戻る
        </Link>
      </div>
    );
  }

  if (!script) {
    notFound();
  }

  const ideaTitle = resolveIdeaTitle(script.ideas);
  const structured = parseStructuredData((script as { structured_data?: unknown }).structured_data);
  const cueOnly = buildCueOnlyText(structured);
  const cueText = cueOnly ?? script.content;
  const cueSource = cueOnly ? ("structured" as const) : ("fallback" as const);
  const productionMeta =
    (script as { structured_data?: unknown }).structured_data &&
    hasProductionMetaContent(structured)
      ? structured
      : null;
  const displayTitle = String((script as { display_title?: string | null }).display_title ?? "").trim() || null;

  return (
    <ScriptTeleprompterView
      scriptId={script.id}
      ideaTitle={ideaTitle}
      displayTitle={displayTitle}
      version={script.version}
      isCurrent={script.is_current}
      cueText={cueText}
      cueSource={cueSource}
      productionMeta={productionMeta}
    />
  );
}
