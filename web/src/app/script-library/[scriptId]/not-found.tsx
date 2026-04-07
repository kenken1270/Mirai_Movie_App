import Link from "next/link";

export default function ScriptCueNotFound() {
  return (
    <div className="container mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-semibold">台本が見つかりません</h1>
      <p className="mt-2 text-sm text-muted-foreground">IDが間違っているか、削除された可能性があります。</p>
      <Link href="/script-library" className="mt-6 inline-block text-sm text-primary underline">
        台本保管庫に戻る
      </Link>
    </div>
  );
}
