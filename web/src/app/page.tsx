import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  listMetricSnapshots,
  listPipelineIdeas,
  listPublishes,
} from "@/lib/repositories/loop-repository";
import { addDays, isInWeekRange, isShortFormPlatform, startOfWeekMonday } from "@/lib/week";
import { createSupabaseClient } from "@/lib/supabase/client";

function calcGrowth(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? "+100%" : "0%";
  const rate = Math.round(((current - previous) / previous) * 100);
  return `${rate > 0 ? "+" : ""}${rate}%`;
}

export default async function Home() {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  async function signOut() {
    "use server";
    const client = createSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    redirect("/auth/login");
  }

  const [{ data: metrics }, { data: ideas }, { data: publishes }] = await Promise.all([
    listMetricSnapshots(),
    listPipelineIdeas(),
    listPublishes(),
  ]);
  const snapshots = (metrics ?? []) as Array<{
    views: number;
    saves: number;
    shares: number;
    recorded_at: string;
  }>;
  const totalViews = snapshots.reduce((sum, x) => sum + (x.views ?? 0), 0);
  const totalSaves = snapshots.reduce((sum, x) => sum + (x.saves ?? 0), 0);
  const totalShares = snapshots.reduce((sum, x) => sum + (x.shares ?? 0), 0);

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const currentPeriod = snapshots.filter((x) => {
    const t = new Date(x.recorded_at).getTime();
    return now - t <= sevenDaysMs;
  });
  const previousPeriod = snapshots.filter((x) => {
    const t = new Date(x.recorded_at).getTime();
    const diff = now - t;
    return diff > sevenDaysMs && diff <= sevenDaysMs * 2;
  });
  const currentViews = currentPeriod.reduce((sum, x) => sum + (x.views ?? 0), 0);
  const previousViews = previousPeriod.reduce((sum, x) => sum + (x.views ?? 0), 0);
  const currentSaves = currentPeriod.reduce((sum, x) => sum + (x.saves ?? 0), 0);
  const previousSaves = previousPeriod.reduce((sum, x) => sum + (x.saves ?? 0), 0);
  const currentShares = currentPeriod.reduce((sum, x) => sum + (x.shares ?? 0), 0);
  const previousShares = previousPeriod.reduce((sum, x) => sum + (x.shares ?? 0), 0);

  const viewsGrowth = calcGrowth(currentViews, previousViews);
  const savesGrowth = calcGrowth(currentSaves, previousSaves);
  const sharesGrowth = calcGrowth(currentShares, previousShares);

  const SHORT_WEEK_GOAL = 6;
  const NOTE_WEEK_GOAL = 1;
  const nowDate = new Date();
  const weekStart = startOfWeekMonday(nowDate);
  const weekEnd = addDays(weekStart, 7);
  const weekPublishes = (publishes ?? []).filter((p: { published_at: string }) =>
    isInWeekRange(p.published_at, weekStart, weekEnd),
  );
  const shortWeekCount = weekPublishes.filter((p: { platform: string }) =>
    isShortFormPlatform(p.platform),
  ).length;
  const noteWeekCount = weekPublishes.filter((p: { platform: string }) => p.platform === "note").length;
  const shortWeekRate = Math.min(100, Math.round((shortWeekCount / SHORT_WEEK_GOAL) * 100));
  const noteWeekRate = Math.min(100, Math.round((noteWeekCount / NOTE_WEEK_GOAL) * 100));
  const backlog = (ideas ?? []).filter((x: { status?: string }) => x.status === "backlog").length;
  const writing = (ideas ?? []).filter((x: { status?: string }) => x.status === "writing").length;
  const recording = (ideas ?? []).filter((x: { status?: string }) => x.status === "recording").length;

  return (
    <div className="container mx-auto min-h-screen max-w-7xl p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          未来塾 SNS 運用
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Instagram · 小紅書 · Note（週次: 短尺6本＋Note1本目安）
        </p>
        {user?.email ? (
          <p className="mt-1 text-xs text-muted-foreground">ログイン中: {user.email}</p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">今週・短尺（目安6）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{shortWeekRate}%</p>
            <p className="text-xs text-muted-foreground">
              {shortWeekCount}/{SHORT_WEEK_GOAL} 本（IG / XHS 等）
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">今週・Note（目安1）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{noteWeekRate}%</p>
            <p className="text-xs text-muted-foreground">
              {noteWeekCount}/{NOTE_WEEK_GOAL} 本
            </p>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">累積再生</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{totalViews}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">今週成長率（前週比）</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">再生 {viewsGrowth}</p><p className="text-xs text-muted-foreground">保存 {savesGrowth}</p><p className="text-xs text-muted-foreground">シェア {sharesGrowth}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">保存/シェア</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{totalSaves} / {totalShares}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">制作滞留</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">backlog {backlog} / writing {writing} / recording {recording}</p></CardContent></Card>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/weekly" className={cn(buttonVariants({ variant: "default" }))}>
          今週
        </Link>
        <Link href="/pipeline" className={cn(buttonVariants({ variant: "default" }))}>
          制作
        </Link>
        <Link href="/publishes" className={cn(buttonVariants({ variant: "secondary" }))}>
          投稿記録
        </Link>
        <Link href="/analytics" className={cn(buttonVariants({ variant: "secondary" }))}>
          分析
        </Link>
        <Link href="/retrospectives" className={cn(buttonVariants({ variant: "secondary" }))}>
          振り返り
        </Link>
        <Link href="/brand" className={cn(buttonVariants({ variant: "outline" }))}>
          ブランド
        </Link>
        <Link href="/next-actions" className={cn(buttonVariants({ variant: "outline" }))}>
          次アクション
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        上級:{" "}
        <Link href="/hypotheses" className="underline-offset-2 hover:underline">
          仮説
        </Link>
        {" · "}
        <Link href="/idea-stock" className="underline-offset-2 hover:underline">
          ネタストック
        </Link>
        {" · "}
        <Link href="/test-themes" className="underline-offset-2 hover:underline">
          接続テスト
        </Link>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
