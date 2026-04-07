"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const client = createSupabaseBrowserClient();
    if (!client) {
      setError("Supabase 設定が見つかりません。");
      return;
    }

    setLoading(true);
    setError(null);
    const result =
      mode === "sign-in"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="container mx-auto flex min-h-screen max-w-md items-center p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{mode === "sign-in" ? "ログイン" : "新規登録"}</CardTitle>
          <CardDescription>未来塾SNS運用OS（2人運用）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" onClick={submit} disabled={loading} className="w-full">
            {loading ? "処理中..." : mode === "sign-in" ? "ログイン" : "登録してログイン"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"))}
          >
            {mode === "sign-in" ? "新規登録に切り替え" : "ログインに切り替え"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
