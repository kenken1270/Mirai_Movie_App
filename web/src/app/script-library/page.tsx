import Link from "next/link";

import { importEpisodeOneIntroScript } from "@/app/script-library/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listScripts } from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type ScriptRow = {
  id: string;
  idea_id: string;
  version: number;
  is_current: boolean;
  created_at: string;
  display_title?: string | null;
  ideas?: { title?: string } | null;
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ScriptLibraryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { data, error } = await listScripts();
  const rows = (data ?? []) as ScriptRow[];
  const qError = one(searchParams.error);
  const qInfo = one(searchParams.info);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>台本保管庫</CardTitle>
          <CardDescription>
            保存済みの台本を一覧し、<strong>構造化編集</strong>で表形式・一工夫メモを管理します。撮影時は「カンペ表示」で大きな文字・全画面で読み上げやすく表示できます。
          </CardDescription>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {qError ? <p className="text-sm text-destructive">{decodeURIComponent(qError)}</p> : null}
          {qInfo ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{decodeURIComponent(qInfo)}</p> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            「第1回：自己紹介・ストーリー」のサンプル台本（60〜90秒・表形式＋字幕/BGMメモ）をまとめて取り込めます。
          </p>
          <form action={importEpisodeOneIntroScript}>
            <Button type="submit" variant="secondary">
              第1回サンプルを保管庫に取り込む
            </Button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">台本がありません。上の取り込み、または台本ページから作成してください。</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">一覧（新しい順）</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">表示タイトル / ネタ</th>
                  <th className="py-2 pr-4 font-medium">版</th>
                  <th className="py-2 pr-4 font-medium">状態</th>
                  <th className="py-2 pr-4 font-medium">作成</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const label = row.display_title?.trim() || row.ideas?.title || "（タイトルなし）";
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="max-w-[280px] py-2 pr-4">
                        <p className="font-medium leading-snug">{label}</p>
                        {row.display_title ? (
                          <p className="text-[11px] text-muted-foreground">ネタ: {row.ideas?.title ?? "—"}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">v{row.version}</td>
                      <td className="py-2 pr-4">
                        {row.is_current ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                            現在版
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">履歴</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("ja-JP")}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/script-library/${row.id}/edit`}
                            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                          >
                            編集
                          </Link>
                          <Link
                            href={`/script-library/${row.id}`}
                            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                          >
                            カンペ
                          </Link>
                          <Link
                            href={`/ideas/${row.idea_id}`}
                            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            ネタ詳細
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
