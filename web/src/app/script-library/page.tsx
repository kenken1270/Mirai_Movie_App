import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listScripts } from "@/lib/repositories/loop-repository";

export const dynamic = "force-dynamic";

type ScriptRow = {
  id: string;
  idea_id: string;
  version: number;
  is_current: boolean;
  created_at: string;
  ideas?: { title?: string } | null;
};

export default async function ScriptLibraryPage() {
  const { data, error } = await listScripts();
  const rows = (data ?? []) as ScriptRow[];

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>台本保管庫</CardTitle>
          <CardDescription>
            保存済みの台本を一覧し、撮影時は「カンペ表示」で大きな文字・全画面で読み上げやすく表示できます。
          </CardDescription>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardHeader>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">台本がありません。台本ページから作成してください。</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">一覧（新しい順）</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">ネタ</th>
                  <th className="py-2 pr-4 font-medium">版</th>
                  <th className="py-2 pr-4 font-medium">状態</th>
                  <th className="py-2 pr-4 font-medium">作成</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="max-w-[280px] py-2 pr-4">
                      <p className="font-medium leading-snug">{row.ideas?.title ?? "（タイトルなし）"}</p>
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
                          href={`/script-library/${row.id}`}
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                        >
                          カンペ表示
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
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
