import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createHypothesis, listHypotheses, updateHypothesisStatus } from "@/lib/repositories/loop-repository";
import type { HypothesisRow, HypothesisStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

const statusOptions: HypothesisStatus[] = [
  "draft",
  "ready",
  "testing",
  "validated",
  "invalidated",
  "archived",
];

function statusLabel(status: HypothesisStatus): string {
  const map: Record<HypothesisStatus, string> = {
    draft: "下書き",
    ready: "準備完了",
    testing: "検証中",
    validated: "有効",
    invalidated: "無効",
    archived: "アーカイブ",
  };
  return map[status];
}

export default async function HypothesesPage() {
  async function onCreate(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const problemStatement = String(formData.get("problem_statement") ?? "").trim();
    const hookHypothesis = String(formData.get("hook_hypothesis") ?? "").trim();
    const successMetric = String(formData.get("success_metric") ?? "save_rate").trim();
    const priority = Number(formData.get("priority") ?? 3);
    if (!title || !problemStatement) return;
    await createHypothesis({ title, problemStatement, hookHypothesis, successMetric, priority });
    revalidatePath("/hypotheses");
  }

  async function onStatusUpdate(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "draft") as HypothesisStatus;
    if (!id) return;
    await updateHypothesisStatus(id, status);
    revalidatePath("/hypotheses");
    revalidatePath("/pipeline");
  }

  const { data, error } = await listHypotheses();
  const rows = (data ?? []) as HypothesisRow[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>仮説ボード</CardTitle>
          <CardDescription>
            ネタの質を上げる起点。動画化の前に「誰の何をどう解決するか」を定義します。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">新しい仮説を作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="grid gap-3 md:grid-cols-2">
            <input
              name="title"
              required
              placeholder="例: 保護者は『勉強しているのに伸びない』理由を知りたい"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
            />
            <textarea
              name="problem_statement"
              required
              placeholder="解決したい課題を明確に書く"
              className="min-h-24 rounded-md border border-input bg-background p-3 text-sm md:col-span-2"
            />
            <input
              name="hook_hypothesis"
              placeholder="冒頭フック仮説（任意）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              name="success_metric"
              defaultValue="save_rate"
              placeholder="成功指標（例: save_rate）"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              name="priority"
              defaultValue={3}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value={1}>優先度1（低）</option>
              <option value={2}>優先度2</option>
              <option value={3}>優先度3</option>
              <option value={4}>優先度4</option>
              <option value={5}>優先度5（高）</option>
            </select>
            <div>
              <Button type="submit">仮説を保存</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">仮説一覧</CardTitle>
          {error ? <CardDescription className="text-destructive">{error}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">仮説はまだありません。</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.title}</p>
                    <form action={onStatusUpdate} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {statusLabel(option)}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" type="submit">
                        更新
                      </Button>
                    </form>
                  </div>
                  <p className="text-sm text-muted-foreground">{row.problem_statement}</p>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>優先度: {row.priority}</span>
                    <span>指標: {row.success_metric}</span>
                    <span>状態: {statusLabel(row.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
