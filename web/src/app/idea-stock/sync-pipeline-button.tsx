"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { syncStockToPipelineAction } from "./actions";

export function SyncToPipelineButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const r = await syncStockToPipelineAction();
            if (r.error) {
              setMessage(r.error);
              return;
            }
            setMessage(`パイプラインに追加しました（新規 ${r.inserted} 件、既にあったためスキップ ${r.skipped} 件）。`);
          });
        }}
      >
        {pending ? "反映中…" : "パイプラインの「ネタ」欄に反映"}
      </Button>
      <Link href="/pipeline" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        パイプラインを開く
      </Link>
      {message ? <p className="text-sm text-muted-foreground sm:flex-1">{message}</p> : null}
    </div>
  );
}
