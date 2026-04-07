import Link from "next/link";
import { notFound } from "next/navigation";

import { ScriptTeleprompterView } from "@/components/script-teleprompter";
import { getScriptById } from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

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

  const ideaTitle = script.ideas?.title ?? "（タイトルなし）";

  return (
    <ScriptTeleprompterView
      scriptId={script.id}
      ideaTitle={ideaTitle}
      version={script.version}
      isCurrent={script.is_current}
      content={script.content}
    />
  );
}
