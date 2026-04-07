"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VideoTheme } from "@/types/video-theme";

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

export function VideoThemesTable({ themes }: { themes: VideoTheme[] }) {
  if (themes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        行がありません。RLS やテーブル名を確認してください。
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">ID</TableHead>
          <TableHead>タイトル</TableHead>
          <TableHead className="max-w-[200px]">フック</TableHead>
          <TableHead>カテゴリ</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead className="max-w-[160px]">キーワード</TableHead>
          <TableHead>ソース</TableHead>
          <TableHead className="max-w-[180px]">タグ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {themes.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.id}</TableCell>
            <TableCell className="max-w-[220px] whitespace-normal break-words">
              {row.title ?? "—"}
            </TableCell>
            <TableCell className="max-w-[200px] whitespace-normal break-words text-muted-foreground">
              {row.hook ?? "—"}
            </TableCell>
            <TableCell>{row.category ?? "—"}</TableCell>
            <TableCell>{row.idea_status ?? "—"}</TableCell>
            <TableCell className="max-w-[160px] whitespace-normal break-words">
              {row.theme_keyword ?? "—"}
            </TableCell>
            <TableCell className="max-w-[120px] whitespace-normal break-words">
              {row.source ?? "—"}
            </TableCell>
            <TableCell className="max-w-[180px] whitespace-normal break-words text-xs">
              {formatTags(row.tags)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
