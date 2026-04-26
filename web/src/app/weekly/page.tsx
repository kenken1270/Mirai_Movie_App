import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPipelineIdeas } from "@/lib/repositories/loop-repository";
import type { IdeaStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

function stageLabel(stage: IdeaStatus): string {
  const map: Record<IdeaStatus, string> = {
    backlog: "ネタ",
    writing: "台本",
    recording: "撮影",
    editing: "編集",
    scheduled: "投稿予約",
    published: "投稿済み",
    dropped: "保留/停止",
  };
  return map[stage];
}

type IdeaRow = {
  id: string;
  title: string;
  hook: string | null;
  status: IdeaStatus;
  created_at: string;
  updated_at?: string;
  scheduled_filming_at?: string | null;
  scheduled_publish_at?: string | null;
  hypotheses?: { title?: string } | null;
};

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inRange(t: number, start: number, end: number) {
  return t >= start && t < end;
}

export default async function WeeklyPage() {
  const { data, error } = await listPipelineIdeas();
  const ideas = (data ?? []) as IdeaRow[];

  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const ws = weekStart.getTime();
  const we = weekEnd.getTime();

  const scheduledThisWeek = ideas.filter((row) => {
    const a = row.scheduled_filming_at ? new Date(row.scheduled_filming_at).getTime() : NaN;
    const b = row.scheduled_publish_at ? new Date(row.scheduled_publish_at).getTime() : NaN;
    return (Number.isFinite(a) && inRange(a, ws, we)) || (Number.isFinite(b) && inRange(b, ws, we));
  });

  const inFlight = ideas.filter((row) =>
    ["writing", "recording", "editing", "scheduled"].includes(row.status),
  );

  const createdThisWeek = ideas.filter((row) => {
    const t = new Date(row.created_at).getTime();
    return inRange(t, ws, we);
  });

  const renderList = (rows: IdeaRow[], empty: string) =>
    rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : (
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <div>
              <Link href={`/ideas/${row.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                {row.title}
              </Link>
              <p className="text-xs text-muted-foreground">仮説: {row.hypotheses?.title ?? "—"}</p>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">{stageLabel(row.status)}</span>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>今週のフォーカス</CardTitle>
          <CardDescription>
            週の区切りは月曜始まり（{weekStart.toLocaleDateString("ja-JP")}〜）。運用目安: 短尺{" "}
            <strong>6本</strong>（IG・小紅書）＋<strong>Note 1本</strong>。予定のあるネタ・制作中・今週新規を分けます。
          </CardDescription>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今週の撮影・公開予定</CardTitle>
        </CardHeader>
        <CardContent>{renderList(scheduledThisWeek, "今週予定のネタはありません（ネタ詳細で日時を入れると表示されます）。")}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">制作ライン上（台本〜投稿予約）</CardTitle>
          <CardDescription>工程が進行中のネタです。滞留の可視化に使ってください。</CardDescription>
        </CardHeader>
        <CardContent>{renderList(inFlight, "該当するネタはありません。")}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今週追加されたネタ</CardTitle>
        </CardHeader>
        <CardContent>{renderList(createdThisWeek, "今週作成されたネタはまだありません。")}</CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/pipeline" className="underline-offset-2 hover:underline">
          制作（パイプライン）へ
        </Link>
      </p>
    </div>
  );
}
