/**
 * Supabase video_themes に対応（列は運用で追加されても表示できるよう余裕を持たせる）
 */
export type VideoTheme = {
  id: number;
  title: string | null;
  hook: string | null;
  category: string | null;
  idea_status: string | null;
  selected_idea: string | null;
  theme_keyword: string | null;
  source: string | null;
  tags: unknown;
};
