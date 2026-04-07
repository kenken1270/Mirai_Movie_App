"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  markdown: string;
  label?: string;
};

export function CopyMarkdownButton({ markdown, label = "Markdownをコピー" }: Props) {
  const [done, setDone] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={onCopy}>
      {done ? "コピーしました" : label}
    </Button>
  );
}
