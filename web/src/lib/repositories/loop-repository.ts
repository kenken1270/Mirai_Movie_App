import { createSupabaseClient } from "@/lib/supabase/client";
import type { HypothesisStatus, IdeaStatus, PublishPlatform } from "@/types/domain";

const SCHEMA = "mirai_sns";

export async function listHypotheses() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("hypotheses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return { data, error: error?.message ?? null };
}

export async function createHypothesis(input: {
  title: string;
  problemStatement: string;
  hookHypothesis: string;
  successMetric: string;
  priority: number;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("hypotheses").insert({
    title: input.title,
    problem_statement: input.problemStatement,
    hook_hypothesis: input.hookHypothesis || null,
    success_metric: input.successMetric || "save_rate",
    priority: input.priority,
  });
  return { error: error?.message ?? null };
}

export async function updateHypothesisStatus(id: string, status: HypothesisStatus) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("hypotheses").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function listPipelineIdeas() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("ideas")
    .select(
      "id,hypothesis_id,title,hook,status,created_at,updated_at,source_note,tags,scheduled_filming_at,scheduled_publish_at,production_checklist,hypotheses(title)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return { data, error: error?.message ?? null };
}

export async function getIdeaById(id: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("ideas")
    .select(
      "id,hypothesis_id,title,hook,status,created_at,source_note,buzzword_id,tags,scheduled_filming_at,scheduled_publish_at,production_checklist,hypotheses(title,problem_statement,hook_hypothesis)",
    )
    .eq("id", id)
    .maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function updateIdea(input: {
  id: string;
  title?: string;
  hook?: string | null;
  sourceNote?: string | null;
  status?: IdeaStatus;
  tags?: string[];
  scheduledFilmingAt?: string | null;
  scheduledPublishAt?: string | null;
  productionChecklist?: Record<string, boolean>;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.hook !== undefined) payload.hook = input.hook;
  if (input.sourceNote !== undefined) payload.source_note = input.sourceNote;
  if (input.status !== undefined) payload.status = input.status;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.scheduledFilmingAt !== undefined) payload.scheduled_filming_at = input.scheduledFilmingAt;
  if (input.scheduledPublishAt !== undefined) payload.scheduled_publish_at = input.scheduledPublishAt;
  if (input.productionChecklist !== undefined) payload.production_checklist = input.productionChecklist;
  const { error } = await supabase.schema(SCHEMA).from("ideas").update(payload).eq("id", input.id);
  return { error: error?.message ?? null };
}

export async function listScriptsByIdea(ideaId: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("scripts")
    .select("id,idea_id,version,language,content,is_current,created_at")
    .eq("idea_id", ideaId)
    .order("version", { ascending: false });
  return { data, error: error?.message ?? null };
}

export async function listPublishesByIdea(ideaId: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("publishes")
    .select("id,idea_id,platform,platform_post_id,published_at,content_type,url,created_at")
    .eq("idea_id", ideaId)
    .order("published_at", { ascending: false });
  return { data, error: error?.message ?? null };
}

export async function listMetricSnapshotsForIdea(ideaId: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data: pubs, error: pubErr } = await supabase
    .schema(SCHEMA)
    .from("publishes")
    .select("id")
    .eq("idea_id", ideaId);
  if (pubErr?.message) return { data: null, error: pubErr.message };
  const ids = (pubs ?? []).map((p: { id: string }) => p.id);
  if (ids.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("metric_snapshots")
    .select(
      "id,publish_id,recorded_at,views,likes,comments,shares,saves,avg_view_duration_sec,completion_rate,publishes(platform)",
    )
    .in("publish_id", ids)
    .order("recorded_at", { ascending: false })
    .limit(50);
  return { data, error: error?.message ?? null };
}

export async function listIdeaAssets(ideaId: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("idea_assets")
    .select("id,idea_id,label,url,created_at")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: false });
  return { data, error: error?.message ?? null };
}

export async function createIdeaAsset(input: { ideaId: string; label: string; url: string }) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const url = input.url.trim();
  if (!url) return { error: "URL が空です。" };
  const { error } = await supabase.schema(SCHEMA).from("idea_assets").insert({
    idea_id: input.ideaId,
    label: input.label.trim() || null,
    url,
  });
  return { error: error?.message ?? null };
}

export async function deleteIdeaAsset(id: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("idea_assets").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function createAiGenerationLog(input: {
  ideaId: string | null;
  kind: string;
  model: string;
  promptSummary: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("ai_generation_logs").insert({
    idea_id: input.ideaId,
    kind: input.kind,
    model: input.model,
    prompt_summary: input.promptSummary.slice(0, 8000),
  });
  return { error: error?.message ?? null };
}

export async function listAiLogsForIdea(ideaId: string) {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("ai_generation_logs")
    .select("id,kind,model,created_at,prompt_summary")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: false })
    .limit(30);
  return { data, error: error?.message ?? null };
}

export async function createIdea(input: {
  hypothesisId: string;
  title: string;
  hook: string;
  status: IdeaStatus;
  buzzwordId?: string;
  sourceNote?: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("ideas").insert({
    hypothesis_id: input.hypothesisId,
    title: input.title,
    hook: input.hook || null,
    status: input.status,
    buzzword_id: input.buzzwordId || null,
    source_note: input.sourceNote || null,
  });
  return { error: error?.message ?? null };
}

export async function moveIdeaStatus(id: string, status: IdeaStatus) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("ideas").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function listPublishes() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("publishes")
    .select("id,idea_id,platform,platform_post_id,published_at,content_type,url,created_at,ideas(title)")
    .order("published_at", { ascending: false })
    .limit(100);
  return { data, error: error?.message ?? null };
}

export async function createPublish(input: {
  ideaId: string;
  platform: PublishPlatform;
  platformPostId: string;
  publishedAt: string;
  contentType: string;
  url: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("publishes").insert({
    idea_id: input.ideaId,
    platform: input.platform,
    platform_post_id: input.platformPostId || null,
    published_at: input.publishedAt,
    content_type: input.contentType || "short_video",
    url: input.url || null,
  });
  return { error: error?.message ?? null };
}

export async function listMetricSnapshots() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("metric_snapshots")
    .select("id,publish_id,recorded_at,views,likes,comments,shares,saves,avg_view_duration_sec,completion_rate,publishes(platform,ideas(title))")
    .order("recorded_at", { ascending: false })
    .limit(100);
  return { data, error: error?.message ?? null };
}

export async function createMetricSnapshot(input: {
  publishId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgViewDurationSec: number | null;
  completionRate: number | null;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("metric_snapshots").insert({
    publish_id: input.publishId,
    views: input.views,
    likes: input.likes,
    comments: input.comments,
    shares: input.shares,
    saves: input.saves,
    avg_view_duration_sec: input.avgViewDurationSec,
    completion_rate: input.completionRate,
  });
  return { error: error?.message ?? null };
}

export async function listRetrospectives() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("retrospectives")
    .select("id,hypothesis_id,publish_id,summary,what_worked,what_failed,next_action,created_at,hypotheses(title),publishes(platform)")
    .order("created_at", { ascending: false })
    .limit(100);
  return { data, error: error?.message ?? null };
}

export async function createRetrospective(input: {
  hypothesisId: string;
  publishId: string;
  summary: string;
  whatWorked: string;
  whatFailed: string;
  nextAction: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("retrospectives").insert({
    hypothesis_id: input.hypothesisId,
    publish_id: input.publishId || null,
    summary: input.summary,
    what_worked: input.whatWorked || null,
    what_failed: input.whatFailed || null,
    next_action: input.nextAction,
  });
  return { error: error?.message ?? null };
}

export async function listBrandProfile() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("brand_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error: error?.message ?? null };
}

export async function upsertBrandProfile(input: {
  id?: string;
  name: string;
  businessSummary: string;
  targetAudience: string;
  valueProposition: string;
  toneOfVoice: string;
  defaultPlatform: string;
  defaultDurationSec: number;
  defaultGoal: string;
  defaultCta: string;
  scriptOsMarkdown: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    name: input.name,
    business_summary: input.businessSummary || null,
    target_audience: input.targetAudience || null,
    value_proposition: input.valueProposition || null,
    tone_of_voice: input.toneOfVoice || null,
    default_platform: input.defaultPlatform,
    default_duration_sec: input.defaultDurationSec,
    default_goal: input.defaultGoal,
    default_cta: input.defaultCta || null,
    script_os_markdown: input.scriptOsMarkdown || null,
  };
  const { error } = await supabase.schema(SCHEMA).from("brand_profiles").upsert(payload);
  return { error: error?.message ?? null };
}

export async function listNeedResearches() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("need_researches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return { data, error: error?.message ?? null };
}

export async function createNeedResearch(input: {
  topic: string;
  audience: string;
  painPoint: string;
  notes: string;
  source?: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("need_researches")
    .insert({
      topic: input.topic,
      audience: input.audience || null,
      pain_point: input.painPoint || null,
      notes: input.notes || null,
      source: input.source || "manual",
    })
    .select("id")
    .single();
  return { data, error: error?.message ?? null };
}

export async function listBuzzwords() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("buzzwords")
    .select("*")
    .eq("saved", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  return { data, error: error?.message ?? null };
}

export async function createBuzzword(input: {
  keyword: string;
  context: string;
  priority: number;
  source?: string;
  needResearchId?: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.schema(SCHEMA).from("buzzwords").insert({
    keyword: input.keyword,
    context: input.context || null,
    priority: input.priority,
    source: input.source || "manual",
    need_research_id: input.needResearchId || null,
  });
  return { error: error?.message ?? null };
}

export async function listScripts() {
  const supabase = createSupabaseClient();
  if (!supabase) return { data: null, error: "Supabase is not configured." };
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from("scripts")
    .select("id,idea_id,version,language,content,is_current,created_at,ideas(title)")
    .order("created_at", { ascending: false })
    .limit(100);
  return { data, error: error?.message ?? null };
}

export async function createScript(input: {
  ideaId: string;
  content: string;
  language?: string;
}) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: current } = await supabase
    .schema(SCHEMA)
    .from("scripts")
    .select("id,version")
    .eq("idea_id", input.ideaId)
    .eq("is_current", true)
    .maybeSingle();

  if (current?.id) {
    await supabase.schema(SCHEMA).from("scripts").update({ is_current: false }).eq("id", current.id);
  }

  const nextVersion = (current?.version ?? 0) + 1;
  const { error } = await supabase.schema(SCHEMA).from("scripts").insert({
    idea_id: input.ideaId,
    version: nextVersion,
    language: input.language || "ja",
    content: input.content,
    is_current: true,
  });
  return { error: error?.message ?? null };
}

export async function updateScriptContent(input: { id: string; content: string }) {
  const supabase = createSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const content = input.content.trim();
  if (!content) return { error: "内容が空です。" };
  const { error } = await supabase
    .schema(SCHEMA)
    .from("scripts")
    .update({ content })
    .eq("id", input.id);
  return { error: error?.message ?? null };
}
