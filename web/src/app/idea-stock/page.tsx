import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listIdeaStockItems } from "@/lib/repositories/loop-repository";

import { SyncToPipelineButton } from "./sync-pipeline-button";

export const dynamic = "force-dynamic";

type IdeaStockRow = {
  id: string;
  strategy_order: number;
  strategy_name: string;
  strategy_purpose: string | null;
  line_order: number;
  hook_text: string;
};

export default async function IdeaStockPage() {
  const { data, error } = await listIdeaStockItems();
  const rows = (data ?? []) as IdeaStockRow[];

  const byStrategy = new Map<
    number,
    { name: string; purpose: string | null; lines: IdeaStockRow[] }
  >();
  for (const row of rows) {
    const cur = byStrategy.get(row.strategy_order);
    if (!cur) {
      byStrategy.set(row.strategy_order, {
        name: row.strategy_name,
        purpose: row.strategy_purpose,
        lines: [row],
      });
    } else {
      cur.lines.push(row);
    }
  }

  const ordered = Array.from(byStrategy.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>ネタストック</CardTitle>
          <CardDescription className="space-y-3">
            <p>
              ここは一覧用のストック（テーブル{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">idea_stock_items</code>
              ）です。カンバンの「ネタ」列は別テーブル{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">ideas</code> を見ているため、下のボタンで
              パイプラインに取り込む必要があります。
            </p>
            <p>
              初回は Supabase で{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">011_idea_stock.sql</code> を実行して 50
              件を入れてから、反映ボタンを押してください。SQL 派は{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">012_sync_idea_stock_to_pipeline.sql</code>{" "}
              でも同じ取り込みができます。
            </p>
            <SyncToPipelineButton disabled={!!error || rows.length === 0} />
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          データがありません。SQL を実行するか、テーブル <code className="rounded bg-muted px-1 text-xs">mirai_sns.idea_stock_items</code>{" "}
          を確認してください。
        </p>
      ) : (
        <div className="space-y-8">
          {ordered.map(([order, block]) => (
            <Card key={order}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {order}. {block.name}
                </CardTitle>
                {block.purpose ? (
                  <CardDescription className="text-foreground/90">{block.purpose}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                  {block.lines.map((line) => (
                    <li key={line.id} className="pl-1">
                      {line.hook_text}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
