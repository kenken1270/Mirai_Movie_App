export type HypothesisStatus =
  | "draft"
  | "ready"
  | "testing"
  | "validated"
  | "invalidated"
  | "archived";

export type IdeaStatus =
  | "backlog"
  | "writing"
  | "recording"
  | "editing"
  | "scheduled"
  | "published"
  | "dropped";

export type HypothesisRow = {
  id: string;
  title: string;
  problem_statement: string;
  hook_hypothesis: string | null;
  success_metric: string;
  target_value: number | null;
  priority: number;
  status: HypothesisStatus;
  created_at: string;
};

export type IdeaRow = {
  id: string;
  hypothesis_id: string;
  title: string;
  hook: string | null;
  status: IdeaStatus;
  created_at: string;
};

export type PublishPlatform = "instagram" | "youtube" | "tiktok" | "x" | "other";

export type PublishRow = {
  id: string;
  idea_id: string;
  platform: PublishPlatform;
  platform_post_id: string | null;
  published_at: string;
  content_type: string;
  url: string | null;
  created_at: string;
};

export type MetricSnapshotRow = {
  id: string;
  publish_id: string;
  recorded_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avg_view_duration_sec: number | null;
  completion_rate: number | null;
};

export type RetrospectiveRow = {
  id: string;
  hypothesis_id: string;
  publish_id: string | null;
  summary: string;
  what_worked: string | null;
  what_failed: string | null;
  next_action: string;
  created_at: string;
};
