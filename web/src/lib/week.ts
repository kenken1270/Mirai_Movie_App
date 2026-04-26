/** 週の開始＝月曜 0:00（ローカル） */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 端点は [start, end) */
export function isInWeekRange(iso: string, weekStart: Date, weekEnd: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= weekStart.getTime() && t < weekEnd.getTime();
}

/** 短尺として数える（レガシーの縦動画系も週内カウント用に含む） */
export function isShortFormPlatform(platform: string): boolean {
  return (
    platform === "instagram" ||
    platform === "xiaohongshu" ||
    platform === "youtube" ||
    platform === "tiktok"
  );
}
