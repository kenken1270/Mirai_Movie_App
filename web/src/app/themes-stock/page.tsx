import Link from "next/link";
import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { VideoTheme } from "@/types/video-theme";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickOne(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeSearch(raw: string): string {
  return raw.replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function formatTags(tags: unknown): string {
  if (tags == null) return "—";
  if (Array.isArray(tags)) return tags.map(String).join(", ");
  if (typeof tags === "string") return tags;
  try {
    return JSON.stringify(tags);
  } catch {
    return String(tags);
  }
}

export default async function ThemesStockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createSupabaseClient();
  const search = pickOne(searchParams.q);
  const category = pickOne(searchParams.category);
  const status = pickOne(searchParams.status);

  async function updateStatus(formData: FormData) {
    "use server";
    const client = createSupabaseClient();
    if (!client) return;

    const id = Number(formData.get("id"));
    const nextStatus = String(formData.get("idea_status") ?? "").trim();
    if (!Number.isFinite(id)) return;

    await client.from("video_themes").update({ idea_status: nextStatus }).eq("id", id);
    revalidatePath("/themes-stock");
  }

  async function toggleSelected(formData: FormData) {
    "use server";
    const client = createSupabaseClient();
    if (!client) return;

    const id = Number(formData.get("id"));
    const current = String(formData.get("current") ?? "");
    if (!Number.isFinite(id)) return;

    const nextValue = current ? null : "selected";
    await client.from("video_themes").update({ selected_idea: nextValue }).eq("id", id);
    revalidatePath("/themes-stock");
  }

  async function deleteTheme(formData: FormData) {
    "use server";
    const client = createSupabaseClient();
    if (!client) return;

    const id = Number(formData.get("id"));
    if (!Number.isFinite(id)) return;

    await client.from("video_themes").delete().eq("id", id);
    revalidatePath("/themes-stock");
  }

  if (!supabase) {
    return (
      <div className="container mx-auto max-w-3xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>Supabase 未設定</CardTitle>
            <CardDescription>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">web/.env.local</code> に
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>
              と
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>
              を設定してください。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  let query = supabase.from("video_themes").select("*").order("id", { ascending: false }).limit(100);
  if (category) query = query.eq("category", category);
  if (status) query = query.eq("idea_status", status);
  if (search) {
    const safe = normalizeSearch(search);
    query = query.or(`title.ilike.%${safe}%,hook.ilike.%${safe}%,theme_keyword.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  const themes = (data ?? []) as VideoTheme[];
  const categoryOptions = Array.from(
    new Set(themes.map((item) => item.category).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b, "ja"));
  const statusOptions = Array.from(
    new Set(themes.map((item) => item.idea_status).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b, "ja"));

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ネタストック</CardTitle>
          <CardDescription>
            `video_themes` の一覧・絞り込み・ステータス更新・選定・削除（Step 2）
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="タイトル / フック / キーワード検索"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              name="category"
              defaultValue={category}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">全カテゴリ</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">全ステータス</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit">絞り込み</Button>
              <Link href="/themes-stock" className="inline-flex">
                <Button type="button" variant="outline">
                  クリア
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">取得エラー</CardTitle>
            <CardDescription className="break-all font-mono text-xs">{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : themes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            条件に一致するデータがありません。
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">タイトル</th>
                    <th className="p-2 text-left">カテゴリ</th>
                    <th className="p-2 text-left">ステータス更新</th>
                    <th className="p-2 text-left">選定</th>
                    <th className="p-2 text-left">タグ</th>
                    <th className="p-2 text-left">削除</th>
                  </tr>
                </thead>
                <tbody>
                  {themes.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="p-2 font-mono text-xs">{row.id}</td>
                      <td className="max-w-[300px] p-2">
                        <p className="break-words font-medium">{row.title ?? "—"}</p>
                        {row.hook ? (
                          <p className="mt-1 break-words text-xs text-muted-foreground">{row.hook}</p>
                        ) : null}
                      </td>
                      <td className="p-2">{row.category ?? "—"}</td>
                      <td className="p-2">
                        <form action={updateStatus} className="flex gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            type="text"
                            name="idea_status"
                            defaultValue={row.idea_status ?? ""}
                            className="h-8 w-36 rounded-md border border-input bg-background px-2 text-xs"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            保存
                          </Button>
                        </form>
                      </td>
                      <td className="p-2">
                        <form action={toggleSelected}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="current" value={row.selected_idea ?? ""} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={row.selected_idea ? "default" : "secondary"}
                          >
                            {row.selected_idea ? "選定中" : "未選定"}
                          </Button>
                        </form>
                      </td>
                      <td className="max-w-[200px] p-2 text-xs text-muted-foreground">
                        <span className="break-words">{formatTags(row.tags)}</span>
                      </td>
                      <td className="p-2">
                        <form action={deleteTheme}>
                          <input type="hidden" name="id" value={row.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            削除
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
