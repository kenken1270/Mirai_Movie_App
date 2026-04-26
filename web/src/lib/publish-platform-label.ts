const LABELS: Record<string, string> = {
  instagram: "Instagram",
  xiaohongshu: "小紅書",
  note: "Note",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  other: "その他",
};

/** 表示用（UI・一覧） */
export function publishPlatformLabelJa(platform: string): string {
  return LABELS[platform] ?? platform;
}

/** 投稿1件の見出し（idea 紐づけ or 独立 Note の title） */
export function publishEntryTitle(
  row: { ideas?: { title?: string | null } | null; title?: string | null; idea_id?: string | null },
): string {
  const fromIdea = row.ideas?.title?.trim();
  if (fromIdea) return fromIdea;
  const t = row.title?.trim();
  if (t) return t;
  return row.idea_id ? "（タイトルなし）" : "（独立 Note）";
}

