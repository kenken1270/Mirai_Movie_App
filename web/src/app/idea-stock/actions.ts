"use server";

import { revalidatePath } from "next/cache";

import { syncIdeaStockToPipeline } from "@/lib/repositories/loop-repository";

export async function syncStockToPipelineAction() {
  const result = await syncIdeaStockToPipeline();
  revalidatePath("/idea-stock");
  revalidatePath("/pipeline");
  revalidatePath("/weekly");
  revalidatePath("/");
  return result;
}
