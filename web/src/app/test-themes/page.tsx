import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { VideoTheme } from "@/types/video-theme";
import { VideoThemesTable } from "./video-themes-table";

export const dynamic = "force-dynamic";

export default async function TestThemesPage() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return (
      <div className="container mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>Supabase 未設定</CardTitle>
            <CardDescription>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                web/.env.local
              </code>{" "}
              に{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              と{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              を設定してください。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("video_themes")
    .select("*")
    .order("id", { ascending: false });

  const themes = (data ?? []) as VideoTheme[];

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>video_themes 接続テスト</CardTitle>
          <CardDescription>
            Supabase の{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              video_themes
            </code>{" "}
            から取得した一覧です（Step 1）。
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">取得エラー</CardTitle>
            <CardDescription className="font-mono text-xs break-all">
              {error.message}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <VideoThemesTable themes={themes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
