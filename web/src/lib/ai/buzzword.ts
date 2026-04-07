import { GoogleGenAI } from "@google/genai";

import { createAiGenerationLog } from "@/lib/repositories/loop-repository";

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
  ideaId?: string | null;
  ideaTitle: string;
  ideaHook: string;
  targetAudience: string;
  platform: string;
  durationSec: number;
  goal: string;
  toneOfVoice: string;
  defaultCta: string;
  businessSummary: string;
  scriptOsMarkdown: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "GEMINI_API_KEY が未設定です。";

  const client = new GoogleGenAI({ apiKey });
  const osBlock =
    input.scriptOsMarkdown?.trim() ||
    "（ブランド設定の「台本OS」が未入力です。/brand で絶対ルールを登録してください。）";

  const prompt = `
あなたはプロのSNSコンサルタント兼ショート動画台本ライターです。
次の条件で、台本を**1本だけ**作成してください（複数案・A/B案は不要。APIコスト節約のため1回出力）。

## 絶対に従うルール（未来塾の台本OS）
以下は運用上の絶対ルールです。矛盾する指示は出さず、このOSを最優先してください。

${osBlock}

---

## この回の制作条件
- 事業・ブランド概要: ${input.businessSummary || "（未設定）"}
- ターゲット: ${input.targetAudience || "（未設定）"}
- 主なプラットフォーム表記: ${input.platform}
- 尺: ${input.durationSec}秒（この秒数に合わせて区切る）
- 目的（アルゴリズム上の狙い）: ${input.goal}
- トーン: ${input.toneOfVoice || "（未設定）"}
- 既定CTAの方向性: ${input.defaultCta || "（未設定）"}

## ネタ
- テーマ/タイトル: ${input.ideaTitle}
- 補足フック案: ${input.ideaHook || "なし"}

## 構成の必須要素（OSと重複する場合はOS優先）
- 冒頭3秒: 視聴維持のための強いフック（視覚・聴覚の指示も一言）
- 中盤: 情報ギャップや逆説で好奇心を維持
- 全体: P.A.S.（Problem → Agitation → Solution）を意識
- 小紅書/RED/在日中国人向けが絡む場合: 実用×感情、保存したくなる具体（チェックリスト等）を後半に

## 出力形式（この順・Markdown）
1) **一行サマリ**（誰向けに何を伝えるか）
2) **Markdown表**（列は必ずこの4列）
   | 秒数 | 映像イメージ | 音声・セリフ（日本語） | 演出・バズ攻略ポイント |
   - 行は尺に合わせて細かく（目安: ${input.durationSec}秒なら ${Math.min(12, Math.max(4, Math.ceil(input.durationSec / 8)))} 行程度）
3) **字幕メモ**（RED向けなら中国語字幕の方針を1〜3行。不要なら「なし」）
4) **BGMメモ**（冒頭/中盤/終盤の雰囲気を1行ずつ）
5) **CTA**（最後に明確な行動を1つ）

読み上げやすい日本語。余計な前置きやメタ説明は書かない。
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text ?? "生成できませんでした。";
  if (input.ideaId && !text.startsWith("GEMINI_API_KEY")) {
    const logResult = await createAiGenerationLog({
      ideaId: input.ideaId,
      kind: "script_draft",
      model: "gemini-2.5-flash",
      promptSummary: prompt,
    });
    if (logResult.error) {
      console.warn("ai_generation_logs insert failed:", logResult.error);
    }
  }
  return text;
}
