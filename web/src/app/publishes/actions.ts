"use server";

import { revalidatePath } from "next/cache";

import { createPublish, moveIdeaStatus } from "@/lib/repositories/loop-repository";
import { ACTIVE_PUBLISH_PLATFORMS, type ActivePublishPlatform } from "@/types/domain";

function parseActivePlatform(s: string): ActivePublishPlatform | null {
  return (ACTIVE_PUBLISH_PLATFORMS as readonly string[]).includes(s) ? (s as ActivePublishPlatform) : null;
}

/**
 * 投稿を追加。成功時 `error` は null。バリデーション失敗は `error` に文言。
 */
export async function createPublishEntry(formData: FormData): Promise<{ error: string | null }> {
  const platformRaw = String(formData.get("platform") ?? "");
  const platform = parseActivePlatform(platformRaw);
  if (!platform) {
    return { error: "媒体を選んでください（Instagram / 小紅書 / Note）。" };
  }

  const ideaIdRaw = String(formData.get("idea_id") ?? "").trim();
  const ideaId = ideaIdRaw || null;
  const publishedAt = String(formData.get("published_at") ?? "").trim();
  if (!publishedAt) {
    return { error: "投稿日時を入力してください。" };
  }

  const platformPostId = String(formData.get("platform_post_id") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const standaloneTitle = String(formData.get("standalone_title") ?? "").trim();
  const contentTypeShort = String(formData.get("content_type") ?? "short_video").trim() || "short_video";
  const contentTypeNote = String(formData.get("content_type_note") ?? "article").trim() || "article";

  if (platform === "instagram" || platform === "xiaohongshu") {
    if (!ideaId) {
      return { error: "Instagram・小紅書は「ネタ」の選択が必須です。" };
    }
    const { error } = await createPublish({
      ideaId,
      platform,
      platformPostId,
      publishedAt,
      contentType: contentTypeShort,
      url,
    });
    if (error) return { error };
    const moveRes = await moveIdeaStatus(ideaId, "published");
    if (moveRes.error) return { error: moveRes.error };
  } else {
    if (ideaId) {
      const { error } = await createPublish({
        ideaId,
        platform: "note",
        platformPostId,
        publishedAt,
        contentType: contentTypeNote,
        url,
      });
      if (error) return { error };
      const moveRes = await moveIdeaStatus(ideaId, "published");
      if (moveRes.error) return { error: moveRes.error };
    } else {
      const { error } = await createPublish({
        ideaId: null,
        platform: "note",
        platformPostId,
        publishedAt,
        contentType: contentTypeNote,
        url,
        standaloneTitle,
      });
      if (error) return { error };
    }
  }

  revalidatePath("/publishes");
  revalidatePath("/pipeline");
  revalidatePath("/weekly");
  revalidatePath("/");
  if (ideaId) {
    revalidatePath(`/ideas/${ideaId}`);
  }
  return { error: null };
}
