"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createHypothesis,
  createIdea,
  createScript,
  findHypothesisByTitle,
  findIdeaByHypothesisAndTitle,
  getCurrentScriptIdForIdea,
  updateScriptStructured,
} from "@/lib/repositories/loop-repository";
import {
  buildMarkdownFromStructured,
  EPISODE_1_INTRO_SAMPLE,
  type ScriptStructuredData,
} from "@/lib/script-structured";

const HYP_TITLE = "ショート動画・シリーズ（台本ストック）";
const IDEA_TITLE = "第1回：自己紹介・ストーリー動画";

export async function importEpisodeOneIntroScript() {
  const hypLookup = await findHypothesisByTitle(HYP_TITLE);
  if (hypLookup.error) {
    redirect(`/script-library?error=${encodeURIComponent(hypLookup.error)}`);
  }
  let hypId = hypLookup.id;
  if (!hypId) {
    const err = await createHypothesis({
      title: HYP_TITLE,
      problemStatement: "ショート動画の台本を仮説とともにストックし、検証する。",
      hookHypothesis: "フックとP.A.S.で保存率を上げる",
      successMetric: "save_rate",
      priority: 3,
    });
    if (err.error) {
      redirect(`/script-library?error=${encodeURIComponent(err.error)}`);
    }
    const again = await findHypothesisByTitle(HYP_TITLE);
    hypId = again.id;
  }
  if (!hypId) {
    redirect(`/script-library?error=${encodeURIComponent("仮説の作成に失敗しました。")}`);
  }

  const { id: existingIdea } = await findIdeaByHypothesisAndTitle(hypId, IDEA_TITLE);
  if (existingIdea) {
    const { id: sid } = await getCurrentScriptIdForIdea(existingIdea);
    if (sid) {
      redirect(`/script-library/${sid}/edit`);
    }
    redirect(
      `/script-library?info=${encodeURIComponent("既にネタはあります。一覧から開いてください。")}`,
    );
  }

  const ideaErr = await createIdea({
    hypothesisId: hypId,
    title: IDEA_TITLE,
    hook: EPISODE_1_INTRO_SAMPLE.theme,
    status: "writing",
  });
  if (ideaErr.error) {
    redirect(`/script-library?error=${encodeURIComponent(ideaErr.error)}`);
  }

  const { id: ideaId } = await findIdeaByHypothesisAndTitle(hypId, IDEA_TITLE);
  if (!ideaId) {
    redirect(`/script-library?error=${encodeURIComponent("ネタの作成後に参照に失敗しました。")}`);
  }

  const md = buildMarkdownFromStructured(EPISODE_1_INTRO_SAMPLE);
  const { error: sErr, scriptId } = await createScript({
    ideaId,
    content: md,
    displayTitle: EPISODE_1_INTRO_SAMPLE.episode_label,
    structuredData: EPISODE_1_INTRO_SAMPLE,
  });
  if (sErr || !scriptId) {
    redirect(`/script-library?error=${encodeURIComponent(sErr ?? "台本の保存に失敗しました。")}`);
  }

  revalidatePath("/script-library");
  revalidatePath("/pipeline");
  revalidatePath("/weekly");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/script-library/${scriptId}/edit?imported=1`);
}

export async function saveStructuredScript(input: {
  scriptId: string;
  displayTitle: string;
  data: ScriptStructuredData;
}) {
  const content = buildMarkdownFromStructured(input.data);
  const err = await updateScriptStructured({
    id: input.scriptId,
    displayTitle: input.displayTitle.trim() || null,
    structuredData: input.data,
    contentFromMarkdown: content,
  });
  if (err.error) {
    return { ok: false as const, message: err.error };
  }
  revalidatePath("/script-library");
  revalidatePath(`/script-library/${input.scriptId}`);
  revalidatePath(`/script-library/${input.scriptId}/edit`);
  revalidatePath("/scripts");
  return { ok: true as const };
}
