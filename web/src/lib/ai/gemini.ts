import { GoogleGenAI } from "@google/genai";

type GenerateInput = {
  bestTitle: string | null;
  topSignals: string;
  failureTags: string[];
  backlogCount: number;
  writingCount: number;
  recentNextActions: string[];
};

export async function generateNextIdeaSuggestions(input: GenerateInput): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return ["`GEMINI_API_KEY` が未設定のため、AI提案を生成できません。"];

  const client = new GoogleGenAI({ apiKey });
  const prompt = `
あなたは未来塾のSNS運用アシスタントです。
以下の運用ログを参考に、次に作るべき動画ネタを3件、簡潔に提案してください。
各提案は「タイトル案 | 狙い | CTA」の1行フォーマットにしてください。

## 運用ログ
- 直近で強い投稿: ${input.bestTitle ?? "なし"}
- 反応シグナル: ${input.topSignals}
- 失敗タグ: ${input.failureTags.join(", ") || "なし"}
- backlog件数: ${input.backlogCount}
- writing件数: ${input.writingCount}
- 最近の次アクション: ${input.recentNextActions.join(" / ") || "なし"}
`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text ?? "";
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  if (lines.length === 0) {
    return ["AI提案を生成できませんでした。入力データを増やして再実行してください。"];
  }
  return lines;
}
