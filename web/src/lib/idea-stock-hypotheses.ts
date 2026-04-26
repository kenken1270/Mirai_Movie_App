/** ネタストック5戦略 → パイプライン仮説（固定IDで再実行しても同じ行に収まる） */

export const NETA_STOCK_HYPOTHESIS_IDS: Record<number, string> = {
  1: "8b3c0d1e-1001-4000-8000-000000000001",
  2: "8b3c0d1e-1002-4000-8000-000000000002",
  3: "8b3c0d1e-1003-4000-8000-000000000003",
  4: "8b3c0d1e-1004-4000-8000-000000000004",
  5: "8b3c0d1e-1005-4000-8000-000000000005",
};

export const NETA_STOCK_HYPOTHESES = [
  {
    order: 1 as const,
    title: "【権威性×教育現場の裏側】戦略",
    problemStatement:
      "「元公立小教師」という肩書きを最大限に活かし、学校教育の限界と未来塾の必要性を説く。",
  },
  {
    order: 2 as const,
    title: "【親の痛み（インサイト）直撃】戦略",
    problemStatement:
      "在日中国人家庭の「中途半端な抑圧・甘やかし」を指摘し、親の行動変容を促す。",
  },
  {
    order: 3 as const,
    title: "【メソッドの可視化（自走OS）】戦略",
    problemStatement: "未来塾独自の「自律・自己調整」のプロセスを見せ、他塾との圧倒的な差を示す。",
  },
  {
    order: 4 as const,
    title: "【未来への適応（AI×人間力）】戦略",
    problemStatement: "予測不能な未来（非予定調和）を生き抜く力を強調し、高意識層を惹きつける。",
  },
  {
    order: 5 as const,
    title: "【安心感と多言語サポート】戦略",
    problemStatement: "奥様との連携、中国語対応、日本教育への橋渡しとしての役割を強調する。",
  },
] as const;
