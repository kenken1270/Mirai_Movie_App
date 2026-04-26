/**
 * 台本の構造化データ（保管庫の編集UI・Markdown生成用）
 */

export type ScriptStructuredRow = {
  time_range: string;
  visual: string;
  audio: string;
  direction: string;
};

export type ScriptStructuredData = {
  episode_label: string;
  theme: string;
  target_audience: string;
  duration_sec_min: number;
  duration_sec_max: number;
  rows: ScriptStructuredRow[];
  subtitle_tips: string;
  bgm_tips: string;
  extra_notes: string;
};

export const EMPTY_STRUCTURED_DATA: ScriptStructuredData = {
  episode_label: "",
  theme: "",
  target_audience: "",
  duration_sec_min: 60,
  duration_sec_max: 90,
  rows: [
    { time_range: "", visual: "", audio: "", direction: "" },
  ],
  subtitle_tips: "",
  bgm_tips: "",
  extra_notes: "",
};

/** 第1回：自己紹介・ストーリー（ユーザー提供の台本案） */
export const EPISODE_1_INTRO_SAMPLE: ScriptStructuredData = {
  episode_label: "第1回：自己紹介・ストーリー動画",
  theme: "なぜ私は安定した公立小の教師を辞めて、この塾を作ったのか？",
  target_audience:
    "教育熱心だが、今の学校教育や子どもの姿勢に不安を感じている在日中国人の保護者。",
  duration_sec_min: 60,
  duration_sec_max: 90,
  rows: [
    {
      time_range: "0-3s",
      visual:
        "あなたがカメラを直視し、真剣な表情。テロップ：「元公立小教師が教える、10年後に後悔する教育」",
      audio: "正直に言います。今の学校教育だけでは、お子さんの未来は守れません。",
      direction: "【超強力フック】 権威性と危機感を同時に提示。",
    },
    {
      time_range: "3-15s",
      visual:
        "以前の教室の風景（またはイメージ）。子どもたちが静かに座っているが、目は死んでいる様子。",
      audio:
        "私は日本の公立小学校で、数千人の子どもを見てきました。管理された『いい子』ほど、実は危ない。指示がないと動けない『指示待ち人間』になってしまうからです。",
      direction: "【現場のリアル】 現場を知る人しか言えない「不都合な真実」を語る。",
    },
    {
      time_range: "15-30s",
      visual:
        "以前見た「自己調整学習」で輝いていたクラスの回想（文字やイラストでも可）。",
      audio:
        "でも、あるクラスは違いました。小学2年生が自分で計画を立て、自ら学びを楽しんでいた。その子たちは、誰に言われなくても日記を書き、成長し続けていたんです。",
      direction: "【光の提示】 解決策があることを示し、期待感を高める。",
    },
    {
      time_range: "30-45s",
      visual: "あなたが未来塾のファイルやタブレットを持っている姿。",
      audio:
        "私は決意しました。教え込むのではなく、子どもの中に『自走するエンジン』を作る場所を作ろうと。それが、未来塾です。",
      direction: "【使命の宣言】 なぜこの活動をしているのかという「Why」を語る。",
    },
    {
      time_range: "45-55s",
      visual: "奥様と並んで笑顔で映る（または奥様のカットを挿入）。",
      audio:
        "妻は中国人です。私たちは、在日中国人のご家庭が抱える孤独な悩みも、言葉の壁も、すべて分かります。",
      direction: "【安心感の醸成】 親近感と独自の強みを一気に伝える。",
    },
    {
      time_range: "55-60s",
      visual: "画面にWeChatのQRコードや「フォロー」の文字。",
      audio:
        "お子さんを『教わる子』から『勝手に育つ子』へ。詳しい教育方針は、プロフィールからチェックしてください。",
      direction: "【明確なCTA】 次に何をすべきか指示を出す。",
    },
  ],
  subtitle_tips:
    "日本語で喋る場合、中国語の字幕は必須です。単なる直訳ではなく、中国の親に刺さる単語（例：自律心＝自律力、管理＝コントロール）を選定します。",
  bgm_tips:
    "冒頭は少し緊張感のあるシリアスな音、後半（解決策の提示）からは明るく希望に満ちたピアノ曲などに切り替えると、視聴者の感情が動きやすくなります。",
  extra_notes: "",
};

export function parseStructuredData(raw: unknown): ScriptStructuredData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_STRUCTURED_DATA, rows: [...EMPTY_STRUCTURED_DATA.rows] };
  }
  const o = raw as Record<string, unknown>;
  const rowsRaw = o.rows;
  let rows: ScriptStructuredRow[] = EMPTY_STRUCTURED_DATA.rows.map((r) => ({ ...r }));
  if (Array.isArray(rowsRaw)) {
    rows = rowsRaw.map((r) => {
      if (!r || typeof r !== "object") return { time_range: "", visual: "", audio: "", direction: "" };
      const x = r as Record<string, unknown>;
      return {
        time_range: String(x.time_range ?? ""),
        visual: String(x.visual ?? ""),
        audio: String(x.audio ?? ""),
        direction: String(x.direction ?? ""),
      };
    });
    if (rows.length === 0) {
      rows = [{ time_range: "", visual: "", audio: "", direction: "" }];
    }
  }
  return {
    episode_label: String(o.episode_label ?? ""),
    theme: String(o.theme ?? ""),
    target_audience: String(o.target_audience ?? ""),
    duration_sec_min: Number(o.duration_sec_min) || 60,
    duration_sec_max: Number(o.duration_sec_max) || 90,
    rows,
    subtitle_tips: String(o.subtitle_tips ?? ""),
    bgm_tips: String(o.bgm_tips ?? ""),
    extra_notes: String(o.extra_notes ?? ""),
  };
}

/**
 * カンペ表示用：秒数・映像・演出を除き、セリフ（audio）のみを改行でつなぐ。
 * 行に audio が無い場合はスキップ。
 */
export function buildCueOnlyText(data: ScriptStructuredData | null): string | null {
  if (!data?.rows?.length) return null;
  const parts = data.rows.map((r) => r.audio.trim()).filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}

export function hasStructuredCue(data: ScriptStructuredData | null): boolean {
  return Boolean(buildCueOnlyText(data));
}

/** 制作情報パネルに出す価値があるか（メタまたはブロックのいずれか） */
export function hasProductionMetaContent(data: ScriptStructuredData | null): boolean {
  if (!data) return false;
  if (data.theme.trim() || data.target_audience.trim()) return true;
  if (data.subtitle_tips.trim() || data.bgm_tips.trim() || data.extra_notes.trim()) return true;
  return data.rows.some(
    (r) =>
      r.time_range.trim() || r.visual.trim() || r.direction.trim() || r.audio.trim(),
  );
}

export function buildMarkdownFromStructured(data: ScriptStructuredData): string {
  const lines: string[] = [];
  const title = data.episode_label.trim() || "（無題の台本）";
  lines.push(`# ${title}`);
  lines.push("");
  if (data.theme.trim()) {
    lines.push(`**テーマ:** ${data.theme.trim()}`);
  }
  if (data.target_audience.trim()) {
    lines.push(`**ターゲット:** ${data.target_audience.trim()}`);
  }
  lines.push(
    `**尺:** ${data.duration_sec_min}〜${data.duration_sec_max}秒（目安）`,
  );
  lines.push("");
  lines.push("## 構成表");
  lines.push("");
  lines.push(
    "| 秒数 | 映像イメージ | 音声・セリフ（日本語） | 演出のポイント（バズ攻略） |",
  );
  lines.push(
    "| :--- | :--- | :--- | :--- |",
  );
  for (const row of data.rows) {
    const tr = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(
      `| ${tr(row.time_range)} | ${tr(row.visual)} | ${tr(row.audio)} | ${tr(row.direction)} |`,
    );
  }
  lines.push("");
  lines.push("## バズらせるための一工夫");
  lines.push("");
  lines.push("### 字幕（RED向け）");
  lines.push(data.subtitle_tips.trim() || "（未記入）");
  lines.push("");
  lines.push("### BGM");
  lines.push(data.bgm_tips.trim() || "（未記入）");
  if (data.extra_notes.trim()) {
    lines.push("");
    lines.push("### その他メモ");
    lines.push(data.extra_notes.trim());
  }
  const cueOnly = buildCueOnlyText(data);
  if (cueOnly) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## カンペ用セリフ（読み上げのみ）");
    lines.push("");
    lines.push(cueOnly);
  }
  lines.push("");
  return lines.join("\n");
}
