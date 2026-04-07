import { GoogleGenAI } from "@google/genai";

export async function brainstormBuzzwords(input: {
  topic: string;
  audience: string;
  painPoint: string;
}): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];
  const client = new GoogleGenAI({ apiKey });

  const prompt = `
あなたはSNS運用アシスタントです。
以下の条件で、ショート動画向けバズワードを8個だけ提案してください。
1行1ワード、余計な説明は不要です。

topic: ${input.topic}
audience: ${input.audience}
pain_point: ${input.painPoint}
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return (response.text ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function draftScriptOnce(input: {
  ideaTitle: string;
  ideaHook: string;
  targetAudience: string;
  platform: string;
  durationSec: number;
  goal: string;
  toneOfVoice: string;
  defaultCta: string;
  businessSummary: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "GEMINI_API_KEY が未設定です。";

  const client = new GoogleGenAI({ apiKey });
  const prompt = `
あなたはショート動画の台本ライターです。
次の条件で、台本を1本だけ作成してください（複数案は不要）。

## 前提
- 事業概要: ${input.businessSummary}
- ターゲット: ${input.targetAudience}
- プラットフォーム: ${input.platform}
- 尺: ${input.durationSec}秒
- 目的: ${input.goal}
- トーン: ${input.toneOfVoice}

## ネタ
- タイトル: ${input.ideaTitle}
- フック案: ${input.ideaHook || "なし"}

## 出力形式
1) Hook（冒頭3秒）
2) Problem
3) Solution
4) CTA（${input.defaultCta || "行動喚起を1つ"}）

短く、読み上げやすい日本語で。
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text ?? "生成できませんでした。";
}
