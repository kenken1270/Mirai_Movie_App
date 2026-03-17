import datetime
import json
import re
from typing import Any, Dict, List, Optional

import google.generativeai as genai
import pandas as pd
import streamlit as st
from supabase import create_client


# -----------------------------
# 共通設定
# -----------------------------
st.set_page_config(
    page_title="未来塾 動画制作ラボ",
    page_icon="🎥",
    layout="wide",
)


# -----------------------------
# 塾プロフィール定数
# -----------------------------
STUDIO_PROFILE = """
塾名: 未来塾（Mirai Juku）
所在地: 大阪府天王寺区上本町
キャッチコピー: 日本で学ぶ日々を、一生の宝物に。
ターゲット: 大阪在住の中国人家庭の公立小中学生
保護者の課題: 成績が伸びない・家庭指導困難・いじめ・将来不安
独自メソッド: BICS/CALP解消、特別支援ノウハウ、自己調整学習（SRL）導入
トーン: 温かく丁寧、伴走者スタイル
CTA例: 「無料体験はLINEから！」
動画尺: 60秒
"""


# -----------------------------
# Supabase 接続ヘルパー
# -----------------------------
@st.cache_resource
def get_supabase_client():
    try:
        url = st.secrets["supabase"]["url"]
        key = st.secrets["supabase"]["key"]
        return create_client(url, key)
    except Exception as e:
        st.error(
            f"Supabaseの接続情報の取得に失敗しました。st.secrets を確認してください。エラー: {e}"
        )
        st.stop()


supabase = get_supabase_client()


# -----------------------------
# 共通ユーティリティ
# -----------------------------
def init_session_state() -> None:
    if "selected_theme_id" not in st.session_state:
        st.session_state.selected_theme_id: Optional[int] = None
    if "selected_script_id" not in st.session_state:
        st.session_state.selected_script_id: Optional[int] = None
    if "generated_ideas" not in st.session_state:
        st.session_state.generated_ideas: List[Dict[str, Any]] = []
    if "generated_script" not in st.session_state:
        st.session_state.generated_script: Dict[str, Any] = {}
    if "current_page" not in st.session_state:
        st.session_state.current_page = "⚙️ 塾プロフィール設定"
    if "project_created" not in st.session_state:
        st.session_state.project_created = False
    if "idea_filter_status" not in st.session_state:
        st.session_state.idea_filter_status = "すべて"
    if "idea_filter_category" not in st.session_state:
        st.session_state.idea_filter_category = "すべて"
    if "idea_search_keyword" not in st.session_state:
        st.session_state.idea_search_keyword = ""
    if "display_columns" not in st.session_state:
        st.session_state.display_columns = 3
    if "view_mode" not in st.session_state:
        st.session_state.view_mode = "PC / タブレット"
    if "mobile_step" not in st.session_state:
        st.session_state.mobile_step = 1


def format_datetime(dt_str: Optional[str]) -> str:
    if not dt_str:
        return "-"
    try:
        dt = datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return dt_str


def parse_studio_profile_defaults() -> Dict[str, Any]:
    defaults: Dict[str, Any] = {
        "studio_name": "",
        "catchcopy": "",
        "mission": "",
        "target": "",
        "pain_points": "",
        "strengths": "",
        "method": "",
        "tone": "",
        "cta_template": "",
        "video_length_sec": 60,
        "ng_words": "",
    }
    lines = [l.strip() for l in STUDIO_PROFILE.strip().splitlines() if l.strip()]
    mapping = {
        "塾名": "studio_name",
        "キャッチコピー": "catchcopy",
        "ターゲット": "target",
        "保護者の課題": "pain_points",
        "独自メソッド": "method",
        "トーン": "tone",
        "CTA例": "cta_template",
        "動画尺": "video_length_sec",
    }
    for line in lines:
        if ":" not in line and "：" not in line:
            continue
        if "：" in line:
            key, value = line.split("：", 1)
        else:
            key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if key in mapping:
            field = mapping[key]
            if field == "video_length_sec":
                num = "".join(ch for ch in value if ch.isdigit())
                defaults[field] = int(num) if num else 60
            else:
                defaults[field] = value
    return defaults


def get_gemini_model() -> Optional[Any]:
    try:
        api_key = st.secrets["gemini"]["api_key"]
    except Exception:
        st.warning("Gemini APIキーが設定されていません（st.secrets['gemini']['api_key']）。")
        return None
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        return model
    except Exception as e:
        st.error(f"Geminiモデルの初期化に失敗しました: {e}")
        return None


def clean_json_text(text: str) -> str:
    cleaned = text.strip()
    cleaned = cleaned.replace("```json", "").replace("```JSON", "")
    cleaned = cleaned.replace("```", "")
    return cleaned.strip()


# -----------------------------
# Gemini 呼び出しヘルパー
# -----------------------------
def generate_video_ideas(theme: str, num_ideas: int) -> List[Dict[str, Any]]:
    model = get_gemini_model()
    if model is None:
        return []

    prompt = f"""
あなたは日本語の動画マーケター兼教育コンサルタントです。
以下の塾プロフィールを前提に、指定されたテーマから短尺動画の企画アイデアを考えてください。

【塾プロフィール】
{STUDIO_PROFILE}

【テーマ】
{theme}

出力フォーマット：JSON配列のみを返してください（コードブロック記号は不要）。

配列の各要素は以下の形式にしてください：
{{
  "title": "動画のタイトル（20〜40文字程度）",
  "hook": "冒頭5秒のフックとなる一文",
  "summary": "動画全体の概要（60〜100文字程度）",
  "target_pain": "この動画で刺さる保護者・生徒の具体的な悩み"
}}

アイデア数は {num_ideas} 件にしてください。
"""

    try:
        response = model.generate_content(prompt)
        text = getattr(response, "text", "") or ""
        cleaned = clean_json_text(text)
        ideas = json.loads(cleaned)
        if isinstance(ideas, dict):
            ideas = [ideas]
        if not isinstance(ideas, list):
            st.error("Geminiからのアイデア応答形式が不正です。")
            return []
        return ideas
    except json.JSONDecodeError:
        st.error("Geminiからのアイデア応答のJSON解析に失敗しました。")
        try:
            st.text_area(
                "Gemini応答（デバッグ用）",
                response.text if "response" in locals() else "",
                height=200,
            )
        except Exception:
            pass
        return []
    except Exception as e:
        st.error(f"アイデア生成中にエラーが発生しました: {e}")
        return []


def generate_script(idea: Dict[str, Any]) -> Dict[str, Any]:
    model = get_gemini_model()
    if model is None:
        return {}

    title = idea.get("title", "")
    hook = idea.get("hook", "")
    summary = idea.get("summary", "")
    target_pain = idea.get("target_pain", "")

    prompt = f"""
あなたは教育系YouTube/TikTokの台本ライターです。
次の塾プロフィールと動画アイデアを元に、約60秒のショート動画台本を作成してください。

【塾プロフィール】
{STUDIO_PROFILE}

【動画アイデア】
タイトル: {title}
フック案: {hook}
概要: {summary}
刺さる悩み: {target_pain}

構成は以下の4セクションにしてください：
1. hook: 0〜5秒のフック
2. problem: 5〜15秒の問題提示
3. solution: 15〜45秒の解決策・本編
4. cta: 45〜60秒のCTA（行動喚起、塾への誘導）

出力フォーマット：次のJSONオブジェクトのみを返してください（コードブロック記号は不要）。
{{
  "hook": "…",
  "problem": "…",
  "solution": "…",
  "cta": "…",
  "full_script": "4つのセクションを自然に繋いだ完全な台本"
}}
"""

    try:
        response = model.generate_content(prompt)
        text = getattr(response, "text", "") or ""
        cleaned = clean_json_text(text)
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            st.error("Geminiからの台本応答形式が不正です。")
            return {}
        return data
    except json.JSONDecodeError:
        st.error("Geminiからの台本応答のJSON解析に失敗しました。")
        try:
            st.text_area(
                "Gemini応答（デバッグ用）",
                response.text if "response" in locals() else "",
                height=200,
            )
        except Exception:
            pass
        return {}
    except Exception as e:
        st.error(f"台本生成中にエラーが発生しました: {e}")
        return {}


def generate_srt(subtitles: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for idx, row in enumerate(subtitles, start=1):
        start = float(row.get("start_sec") or 0)
        end = float(row.get("end_sec") or 0)
        text = row.get("text_ja") or ""

        def sec_to_timestamp(sec: float) -> str:
            ms = int((sec - int(sec)) * 1000)
            s = int(sec) % 60
            m = int(sec) // 60 % 60
            h = int(sec) // 3600
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

        lines.append(str(idx))
        lines.append(f"{sec_to_timestamp(start)} --> {sec_to_timestamp(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


# 字幕用テキストをGeminiで生成
def generate_subtitle_texts(
    full_script: str, num_subtitles: int, api_key: str
) -> List[str]:
    """
    台本全文を受け取り、字幕用の短いテキストを num_subtitles 個生成して返す。
    """
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
    except Exception as e:
        st.error(f"Geminiモデルの初期化に失敗しました（字幕生成）: {e}")
        return [""] * num_subtitles

    prompt = f"""
以下の動画台本を{num_subtitles}個の字幕テキストに変換してください。

## ルール
- 各字幕は15文字以内
- 視聴者の目に止まるキーワードや感情を揺さぶるフレーズを抽出
- 体言止め・短いフレーズを優先（例：「成績が伸びない理由」「実は〇〇だった！」）
- 説明文ではなく「見出し」のようなイメージ
- JSON配列で出力（文字列のみ）：["字幕1", "字幕2", ...]
- JSONのみ出力、説明文不要

## 台本
{full_script}
"""
    try:
        response = model.generate_content(prompt)
        raw = (getattr(response, "text", "") or "").strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            if len(parts) >= 2:
                raw = parts[1]
            raw = raw.strip()
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()
        subtitles: List[str] = json.loads(raw)
        if not isinstance(subtitles, list):
            raise ValueError("JSON配列ではありません。")
        subtitles = [str(s) for s in subtitles]
        while len(subtitles) < num_subtitles:
            subtitles.append("")
        return subtitles[:num_subtitles]
    except Exception as e:
        st.error(f"字幕生成エラー: {e}")
        return [""] * num_subtitles


# -----------------------------
# Page 1: 塾プロフィール設定
# -----------------------------
def page_profile() -> None:
    st.header("⚙️ 塾プロフィール設定")
    st.caption("塾の基礎情報を設定すると、全ページのAI生成に自動で反映されます。")

    defaults = parse_studio_profile_defaults()
    data: Dict[str, Any] = {}

    try:
        res = (
            supabase.table("studio_profile")
            .select("*")
            .eq("id", 1)
            .limit(1)
            .execute()
        )
        if getattr(res, "error", None):
            st.error(f"プロフィール取得に失敗しました: {res.error}")
        rows = res.data or []
        data = rows[0] if rows else {}
    except Exception as e:
        st.error(f"プロフィール取得中にエラーが発生しました: {e}")
        data = {}

    studio_name = st.text_input(
        "塾名",
        value=data.get("studio_name") or defaults["studio_name"],
    )
    catchcopy = st.text_input(
        "キャッチコピー",
        value=data.get("catchcopy") or defaults["catchcopy"],
    )
    mission = st.text_area(
        "ミッション（塾の存在意義）",
        value=data.get("mission") or "",
    )
    target = st.text_area(
        "ターゲット（理想の生徒・保護者像）",
        value=data.get("target") or defaults["target"],
    )
    pain_points = st.text_area(
        "保護者・生徒の主な悩み",
        value=data.get("pain_points") or defaults["pain_points"],
    )
    strengths = st.text_area(
        "塾の強み・他塾との違い",
        value=data.get("strengths") or "",
    )
    method = st.text_area(
        "指導メソッドの特徴",
        value=data.get("method") or defaults["method"],
    )
    tone = st.text_input(
        "トーン（話し方の雰囲気）",
        value=data.get("tone") or defaults["tone"],
    )
    cta_template = st.text_input(
        "CTAテンプレート（例：無料体験はLINEから！）",
        value=data.get("cta_template") or defaults["cta_template"],
    )
    video_length_sec = st.number_input(
        "標準動画尺（秒）",
        min_value=10,
        max_value=600,
        value=int(data.get("video_length_sec") or defaults["video_length_sec"]),
    )
    ng_words = st.text_area(
        "NGワード（使ってほしくない表現）",
        value=data.get("ng_words") or "",
    )

    if st.button("プロフィールを保存"):
        payload = {
            "id": 1,
            "studio_name": studio_name,
            "catchcopy": catchcopy,
            "mission": mission,
            "target": target,
            "pain_points": pain_points,
            "strengths": strengths,
            "method": method,
            "tone": tone,
            "cta_template": cta_template,
            "video_length_sec": int(video_length_sec),
            "ng_words": ng_words,
        }
        try:
            res = supabase.table("studio_profile").upsert(payload).execute()
            if getattr(res, "error", None):
                st.error(f"保存に失敗しました: {res.error}")
            else:
                st.success("プロフィールを保存しました。")
        except Exception as e:
            st.error(f"プロフィール保存中にエラーが発生しました: {e}")


# -----------------------------
# Page 2: テーマ & アイデア生成
# -----------------------------
def page_ideas() -> None:
    st.header("💡 テーマ & アイデア生成")
    st.caption("塾プロフィールを元に、動画テーマから複数のアイデアを自動生成します。")

    # カテゴリ一覧を取得
    categories: List[Dict[str, Any]] = []
    try:
        res_cat = supabase.table("idea_categories").select("*").order("name", desc=False).execute()
        if getattr(res_cat, "error", None):
            st.error(f"カテゴリ取得に失敗しました: {res_cat.error}")
        else:
            categories = res_cat.data or []
    except Exception as e:
        st.error(f"カテゴリ取得中にエラーが発生しました: {e}")

    # カテゴリ管理セクション
    with st.expander("🏷️ カテゴリ管理", expanded=False):
        st.subheader("カテゴリ一覧")
        if categories:
            for cat in categories:
                cols = st.columns([3, 1])
                cols[0].write(cat.get("name") or "")
                with cols[1]:
                    if st.button("削除", key=f"delete_cat_{cat['id']}"):
                        try:
                            res_del = (
                                supabase.table("idea_categories")
                                .delete()
                                .eq("id", cat["id"])
                                .execute()
                            )
                            if getattr(res_del, "error", None):
                                st.error(f"カテゴリ削除に失敗しました: {res_del.error}")
                            else:
                                st.success("カテゴリを削除しました。")
                                st.rerun()
                        except Exception as e:
                            st.error(f"カテゴリ削除中にエラーが発生しました: {e}")
        else:
            st.info("カテゴリがまだ登録されていません。下のフォームから追加できます。")

        st.markdown("---")
        st.subheader("新規カテゴリを追加")
        new_cat_name = st.text_input("カテゴリ名", key="new_category_name")
        if st.button("カテゴリを追加"):
            if not new_cat_name.strip():
                st.warning("カテゴリ名を入力してください。")
            else:
                try:
                    res_ins = (
                        supabase.table("idea_categories")
                        .insert({"name": new_cat_name.strip()})
                        .execute()
                    )
                    if getattr(res_ins, "error", None):
                        st.error(f"カテゴリ追加に失敗しました: {res_ins.error}")
                    else:
                        st.success("カテゴリを追加しました。")
                        st.rerun()
                except Exception as e:
                    st.error(f"カテゴリ追加中にエラーが発生しました: {e}")

    # カード用CSS（ページ全体）
    st.markdown(
        """
<style>
.idea-card {
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.status-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
}
.category-label {
    font-size: 12px;
    color: #666;
    font-weight: 500;
}
.card-title {
    font-size: 16px;
    font-weight: 700;
    margin: 8px 0 4px 0;
    color: #1a1a1a;
}
.card-sub {
    font-size: 13px;
    color: #555;
    margin: 2px 0;
}
.card-meta {
    font-size: 12px;
    color: #888;
    margin: 2px 0;
}
</style>
""",
        unsafe_allow_html=True,
    )

    # アイデア生成フォーム（折りたたみ）
    with st.expander("✨ 新しいアイデアを生成する", expanded=False):
        theme = st.text_input("動画テーマ・キーワード（例：新学期 不安 中国ルーツの子）")
        num_ideas = st.slider("生成するアイデア数", min_value=1, max_value=10, value=5)

        cat_options = ["未分類"] + [c.get("name") or "" for c in categories]
        selected_category = st.selectbox("カテゴリを選択", cat_options)

        if st.button("アイデアを生成"):
            if not theme.strip():
                st.warning("テーマキーワードを入力してください。")
            else:
                with st.spinner("Geminiでアイデアを生成中..."):
                    ideas = generate_video_ideas(theme.strip(), num_ideas)
                st.session_state.generated_ideas = ideas
                if not ideas:
                    st.info("生成されたアイデアがありませんでした。")

        ideas = st.session_state.get("generated_ideas", [])
        if ideas:
            st.markdown("#### 生成結果（保存したいアイデアを選択）")
            for idx, idea in enumerate(ideas):
                g_title = idea.get("title") or f"アイデア {idx + 1}"
                g_hook = idea.get("hook") or ""
                g_summary = idea.get("summary") or ""
                g_pain = idea.get("target_pain") or ""
                st.markdown(f"**タイトル**: {g_title}")
                st.markdown(f"📣 フック: {g_hook}")
                st.markdown(f"📝 概要: {g_summary}")
                st.markdown(f"😟 悩み: {g_pain}")
                if st.button("このアイデアを保存", key=f"save_generated_{idx}"):
                    payload = {
                        "theme_keyword": theme,
                        "category": "" if selected_category == "未分類" else selected_category,
                        "idea_status": "未使用",
                        "generated_ideas": json.dumps([idea], ensure_ascii=False),
                        "selected_idea": json.dumps(idea, ensure_ascii=False),
                    }
                    try:
                        res = supabase.table("video_themes").insert(payload).execute()
                        if getattr(res, "error", None):
                            st.error(f"アイデア保存に失敗しました: {res.error}")
                        else:
                            st.success("アイデアを保存しました。")
                            st.rerun()
                    except Exception as e:
                        st.error(f"アイデア保存中にエラーが発生しました: {e}")
                st.markdown("---")

    st.subheader("保存済みアイデア一覧")

    # フィルターバー
    status_options = ["すべて", "未使用", "使う予定", "制作中", "完了", "アーカイブ"]
    col_f1, col_f2, col_f3 = st.columns([2, 2, 3])
    with col_f1:
        st.session_state.idea_filter_status = st.selectbox(
            "ステータス",
            status_options,
            index=status_options.index(st.session_state.idea_filter_status)
            if st.session_state.idea_filter_status in status_options
            else 0,
        )
    cat_filter_options = ["すべて"] + [c.get("name") or "" for c in categories]
    with col_f2:
        st.session_state.idea_filter_category = st.selectbox(
            "カテゴリ",
            cat_filter_options,
            index=cat_filter_options.index(st.session_state.idea_filter_category)
            if st.session_state.idea_filter_category in cat_filter_options
            else 0,
        )
    with col_f3:
        st.session_state.idea_search_keyword = st.text_input(
            "キーワード検索",
            value=st.session_state.idea_search_keyword,
        )

    # video_themes を取得＆フィルタリング（テーブル用）
    themes: List[Dict[str, Any]] = []
    try:
        q = supabase.table("video_themes").select("*").order(
            "created_at", desc=True
        )
        # デフォルトではアーカイブは除外
        if st.session_state.idea_filter_status == "すべて":
            q = q.neq("idea_status", "アーカイブ")
        else:
            q = q.eq("idea_status", st.session_state.idea_filter_status)
        if (
            st.session_state.idea_filter_category != "すべて"
            and st.session_state.idea_filter_category
        ):
            q = q.eq("category", st.session_state.idea_filter_category)
        res_themes = q.execute()
        if getattr(res_themes, "error", None):
            st.error(f"アイデア取得に失敗しました: {res_themes.error}")
        else:
            themes = res_themes.data or []
    except Exception as e:
        st.error(f"アイデア取得中にエラーが発生しました: {e}")

    if not themes:
        st.info("条件に一致するアイデアがありません。")
        return

    # 表示用 DataFrame 構築
    rows_for_df: List[Dict[str, Any]] = []
    id_to_selected_json: Dict[Any, str] = {}
    id_to_generated_json: Dict[Any, str] = {}

    for t in themes:
        theme_id = t.get("id")
        sel_raw = t.get("selected_idea") or "{}"
        gen_raw = t.get("generated_ideas") or "[]"
        id_to_selected_json[theme_id] = sel_raw
        id_to_generated_json[theme_id] = gen_raw
        try:
            idea_data = json.loads(sel_raw)
        except Exception:
            idea_data = {}
        title = idea_data.get("title") or t.get("theme_keyword") or "タイトル未設定"
        created = t.get("created_at") or ""
        if created:
            try:
                created = str(
                    datetime.datetime.fromisoformat(
                        created.replace("Z", "+00:00")
                    ).date()
                )
            except Exception:
                pass
        rows_for_df.append(
            {
                "id": theme_id,
                "selected_idea": title,
                "category": t.get("category") or "未分類",
                "idea_status": t.get("idea_status") or "未使用",
                "theme_keyword": t.get("theme_keyword") or "",
                "created_at": created,
            }
        )

    df = pd.DataFrame(rows_for_df)

    # キーワード検索（タイトルとテーマに対して）
    kw = st.session_state.idea_search_keyword.strip().lower()
    if kw:
        mask = df["selected_idea"].str.lower().str.contains(kw) | df[
            "theme_keyword"
        ].str.lower().str.contains(kw)
        df = df[mask]

    if df.empty:
        st.info("条件に一致するアイデアがありません。")
        return

    original_df = df.copy()
    category_names = ["未分類"] + [c.get("name") or "" for c in categories]

    edited_df = st.data_editor(
        df,
        num_rows="fixed",
        use_container_width=True,
        hide_index=True,
        height=400,
        key="ideas_table",
        column_config={
            "id": None,
            "selected_idea": st.column_config.TextColumn("タイトル", width="large"),
            "category": st.column_config.SelectboxColumn(
                "カテゴリ",
                options=category_names,
                width="medium",
            ),
            "idea_status": st.column_config.SelectboxColumn(
                "ステータス",
                options=["未使用", "使う予定", "制作中", "完了", "アーカイブ"],
                width="small",
            ),
            "theme_keyword": st.column_config.TextColumn(
                "テーマ", disabled=True, width="medium"
            ),
            "created_at": st.column_config.TextColumn(
                "作成日", disabled=True, width="small"
            ),
        },
    )

    # 変更保存ボタン
    if st.button("💾 変更を保存", type="primary"):
        try:
            for idx, row in edited_df.iterrows():
                orig_row = original_df.loc[idx]
                if (
                    row["selected_idea"] != orig_row["selected_idea"]
                    or row["category"] != orig_row["category"]
                    or row["idea_status"] != orig_row["idea_status"]
                ):
                    theme_id = row["id"]
                    sel_json = id_to_selected_json.get(theme_id) or "{}"
                    try:
                        idea_data = json.loads(sel_json)
                    except Exception:
                        idea_data = {}
                    idea_data["title"] = row["selected_idea"]
                    new_category = "" if row["category"] == "未分類" else row["category"]
                    res_upd = (
                        supabase.table("video_themes")
                        .update(
                            {
                                "selected_idea": json.dumps(
                                    idea_data, ensure_ascii=False
                                ),
                                "category": new_category,
                                "idea_status": row["idea_status"],
                            }
                        )
                        .eq("id", theme_id)
                        .execute()
                    )
                    if getattr(res_upd, "error", None):
                        st.error(f"ID {theme_id} の更新に失敗しました: {res_upd.error}")
                        break
            else:
                st.success("保存しました！")
                st.rerun()
        except Exception as e:
            st.error(f"保存処理中にエラーが発生しました: {e}")

    # 行選択時の詳細表示
    selection = st.session_state.get("ideas_table", {}).get("selection", {})
    selected_rows = selection.get("rows", []) if isinstance(selection, dict) else []

    if selected_rows:
        sel_idx = selected_rows[0]
        try:
            selected_row = edited_df.iloc[sel_idx]
        except Exception:
            selected_row = None
        if selected_row is not None:
            theme_id = selected_row["id"]
            gen_raw = id_to_generated_json.get(theme_id) or "[]"
            try:
                gen_list = json.loads(gen_raw)
                if isinstance(gen_list, dict):
                    gen_list = [gen_list]
            except Exception:
                gen_list = []
            first_gen = gen_list[0] if gen_list else {}
            hook = first_gen.get("hook") or ""
            summary = first_gen.get("summary") or ""
            pain = first_gen.get("target_pain") or ""

            with st.expander("📋 詳細情報", expanded=True):
                st.markdown(f"**📣 フック:** {hook}")
                st.markdown(f"**📝 概要:** {summary}")
                st.markdown(f"**😟 刺さる悩み:** {pain}")

                col1, col2 = st.columns(2)
                with col1:
                    if st.button(
                        "🎬 このアイデアで台本を作る",
                        key=f"use_theme_detail_{theme_id}",
                        use_container_width=True,
                    ):
                        try:
                            st.session_state.selected_theme_id = theme_id
                            st.session_state.generated_script = {}
                            st.session_state.current_page = "📝 台本 & 字幕 自動生成"
                            st.success("台本自動生成ページに移動します。")
                            st.rerun()
                        except Exception as e:
                            st.error(f"遷移中にエラーが発生しました: {e}")
                with col2:
                    if st.button(
                        "🗑️ アーカイブ",
                        key=f"archive_theme_detail_{theme_id}",
                        use_container_width=True,
                    ):
                        try:
                            res_upd = (
                                supabase.table("video_themes")
                                .update({"idea_status": "アーカイブ"})
                                .eq("id", theme_id)
                                .execute()
                            )
                            if getattr(res_upd, "error", None):
                                st.error(
                                    f"アーカイブ更新に失敗しました: {res_upd.error}"
                                )
                            else:
                                st.success("アイデアをアーカイブしました。")
                                st.rerun()
                        except Exception as e:
                            st.error(f"アーカイブ更新中にエラーが発生しました: {e}")


# -----------------------------
def page_script_pc() -> None:
    st.header("📝 台本 & 字幕 自動生成")
    st.caption("選択したアイデアから台本と字幕を自動生成します。")

    theme_id = st.session_state.get("selected_theme_id")
    if not theme_id:
        st.info("まず「💡 テーマ & アイデア生成」でアイデアを選択してください。")
        return

    try:
        res = (
            supabase.table("video_themes")
            .select("*")
            .eq("id", theme_id)
            .limit(1)
            .execute()
        )
        if getattr(res, "error", None):
            st.error(f"テーマ取得に失敗しました: {res.error}")
            return
        rows = res.data or []
        if not rows:
            st.error("選択されたテーマが見つかりません。")
            return
        theme_row = rows[0]
        selected_idea_json = theme_row.get("selected_idea") or "{}"
        selected_idea = json.loads(selected_idea_json)
    except Exception as e:
        st.error(f"テーマ取得中にエラーが発生しました: {e}")
        return

    st.subheader("STEP 1: 選択中のアイデア")
    st.markdown(f"**タイトル**：{selected_idea.get('title', '')}")
    st.markdown(f"**フック案**：{selected_idea.get('hook', '')}")
    st.markdown(f"**概要**：{selected_idea.get('summary', '')}")
    st.markdown(f"**刺さる悩み**：{selected_idea.get('target_pain', '')}")

    st.markdown("---")

    st.subheader("STEP 2: 台本自動生成")

    script_data = st.session_state.get("generated_script") or {}

    if st.button("台本を自動生成"):
        with st.spinner("Geminiで台本を生成中..."):
            script_data = generate_script(selected_idea)
        st.session_state.generated_script = script_data
        if not script_data:
            st.info("台本の自動生成に失敗しました。")

    if not script_data:
        st.info("まだ台本が生成されていません。「台本を自動生成」ボタンを押してください。")
        return

    hook_text = st.text_area("フック（0〜5秒）", value=script_data.get("hook", ""), height=80)
    problem_text = st.text_area(
        "問題提示（5〜15秒）", value=script_data.get("problem", ""), height=100
    )
    solution_text = st.text_area(
        "解決策・本編（15〜45秒）", value=script_data.get("solution", ""), height=200
    )
    cta_text = st.text_area("CTA（45〜60秒）", value=script_data.get("cta", ""), height=80)

    if script_data.get("full_script"):
        default_full = script_data["full_script"]
    else:
        default_full = "\n\n".join(
            [
                f"【フック】\n{hook_text}",
                f"【問題提示】\n{problem_text}",
                f"【解決策】\n{solution_text}",
                f"【CTA】\n{cta_text}",
            ]
        )
    full_script = st.text_area("フル台本（編集可）", value=default_full, height=260)

    if st.button("台本を保存"):
        payload = {
            "idea_id": theme_id,
            "title": selected_idea.get("title"),
            "hook": hook_text,
            "problem": problem_text,
            "solution": solution_text,
            "cta": cta_text,
            "full_script": full_script,
            "language": "ja",
            "status": "自動生成",
        }
        try:
            res = supabase.table("video_scripts").insert(payload).execute()
            if getattr(res, "error", None):
                st.error(f"台本保存に失敗しました: {res.error}")
            else:
                row = (res.data or [{}])[0]
                st.session_state.selected_script_id = row.get("id")
                st.session_state.project_created = False
                st.success("台本を保存しました。続けて字幕を自動生成できます。")
        except Exception as e:
            st.error(f"台本保存中にエラーが発生しました: {e}")

    st.markdown("---")

    st.subheader("STEP 3: 字幕自動生成")

    script_id = st.session_state.get("selected_script_id")
    if not script_id:
        st.info("字幕生成には、まず上で台本を保存してください。")
        return

    if st.button("字幕を自動生成"):
        video_length_sec = 60
        try:
            res_prof = (
                supabase.table("studio_profile")
                .select("video_length_sec")
                .eq("id", 1)
                .limit(1)
                .execute()
            )
            if not getattr(res_prof, "error", None):
                rows = res_prof.data or []
                if rows:
                    video_length_sec = int(rows[0].get("video_length_sec") or 60)
        except Exception:
            pass

        num_subtitles = max(3, int(video_length_sec / 5))
        st.info(f"動画 {video_length_sec}秒 → {num_subtitles}個の字幕を生成します。")

        clean_script = re.sub(r"【[^】]*】", "", full_script)
        clean_script = re.sub(r"\n+", "\n", clean_script).strip()

        try:
            api_key = st.secrets["gemini"]["api_key"]
        except Exception:
            st.warning("Gemini APIキーが設定されていません（st.secrets['gemini']['api_key']）。")
            return

        with st.spinner("Geminiで字幕用テキストを生成中..."):
            subtitle_texts = generate_subtitle_texts(
                clean_script, num_subtitles, api_key
            )

        step = video_length_sec / num_subtitles
        subtitles_rows: List[Dict[str, Any]] = []
        for idx, text in enumerate(subtitle_texts):
            start = int(step * idx)
            end = int(step * (idx + 1))
            subtitles_rows.append(
                {
                    "script_id": script_id,
                    "order_num": idx + 1,
                    "start_sec": start,
                    "end_sec": end,
                    "text_ja": text,
                    "text_zh": "",
                    "style": "",
                }
            )

        try:
            supabase.table("video_subtitles").delete().eq(
                "script_id", script_id
            ).execute()
            res = supabase.table("video_subtitles").insert(subtitles_rows).execute()
            if getattr(res, "error", None):
                st.error(f"字幕保存に失敗しました: {res.error}")
            else:
                st.success("字幕を自動生成して保存しました。")
        except Exception as e:
            st.error(f"字幕保存中にエラーが発生しました: {e}")

    try:
        res_subs = (
            supabase.table("video_subtitles")
            .select("*")
            .eq("script_id", script_id)
            .order("order_num", desc=False)
            .execute()
        )
        if getattr(res_subs, "error", None):
            st.error(f"字幕取得に失敗しました: {res_subs.error}")
            return
        subtitles = res_subs.data or []
    except Exception as e:
        st.error(f"字幕取得中にエラーが発生しました: {e}")
        return

    if subtitles:
        st.markdown("#### 自動生成された字幕一覧")
        df = pd.DataFrame(subtitles)[["order_num", "start_sec", "end_sec", "text_ja"]]
        df = df.rename(
            columns={
                "order_num": "順番",
                "start_sec": "開始秒",
                "end_sec": "終了秒",
                "text_ja": "日本語テキスト",
            }
        )
        st.dataframe(df, use_container_width=True)

        srt_text = generate_srt(subtitles)
        st.download_button(
            label="SRTファイルをダウンロード",
            data=srt_text,
            file_name=f"script_{script_id}_subtitles.srt",
            mime="text/plain",
        )

        if script_id and not st.session_state.get("project_created", False):
            if st.button("📊 このプロジェクトを管理画面に追加する"):
                project_title = selected_idea.get("title") or "無題プロジェクト"
                payload = {
                    "title": project_title,
                    "platform": "未設定",
                    "status": "撮影中",
                    "post_date": None,
                    "views": 0,
                    "inquiries": 0,
                    "memo": f"台本から自動作成（script_id={script_id}）",
                    "notes": f"台本から自動作成（script_id={script_id}）",
                }
                try:
                    res = supabase.table("video_projects").insert(payload).execute()
                    if getattr(res, "error", None):
                        st.error(f"プロジェクト作成エラー: {res.error}")
                    else:
                        st.session_state.project_created = True
                        st.success(
                            "プロジェクトを作成しました！進捗ダッシュボードで管理できます。"
                        )
                except Exception as e:
                    st.error(f"プロジェクト作成エラー: {e}")
        elif script_id and st.session_state.get("project_created", False):
            st.info("✅ この台本からのプロジェクトは作成済みです。")
    else:
        st.info("字幕がまだ登録されていません。")


def page_script_mobile() -> None:
    st.markdown(
        """
<style>
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.step {
  padding: 6px 12px;
  border-radius: 20px;
  background: #f0f0f0;
  color: #999;
  font-size: 13px;
  font-weight: bold;
}
.step.active {
  background: #4CAF50;
  color: white;
}
.step-arrow {
  color: #ccc;
  font-size: 18px;
}
</style>
""",
        unsafe_allow_html=True,
    )

    step = st.session_state.get("mobile_step", 1)
    step = int(step) if step in [1, 2, 3] else 1
    st.session_state.mobile_step = step

    st.markdown(
        f"""
<div class="step-indicator">
  <div class="step {'active' if step==1 else ''}">① アイデア選択</div>
  <div class="step-arrow">›</div>
  <div class="step {'active' if step==2 else ''}">② 台本生成</div>
  <div class="step-arrow">›</div>
  <div class="step {'active' if step==3 else ''}">③ 確認・保存</div>
</div>
""",
        unsafe_allow_html=True,
    )

    if step == 1:
        st.subheader("📋 アイデアを選んでください")
        try:
            res = (
                supabase.table("video_themes")
                .select("*")
                .neq("idea_status", "アーカイブ")
                .order("created_at", desc=True)
                .limit(20)
                .execute()
            )
            if getattr(res, "error", None):
                st.error(f"アイデア取得に失敗しました: {res.error}")
                return
            themes = res.data or []
        except Exception as e:
            st.error(f"アイデア取得中にエラーが発生しました: {e}")
            return

        if not themes:
            st.info("まずアイデアページでアイデアを生成してください。")
            if st.button("💡 アイデアページへ", use_container_width=True):
                st.session_state.current_page = "💡 テーマ & アイデア生成"
                st.rerun()
            return

        for t in themes:
            theme_id = t.get("id")
            sel_raw = t.get("selected_idea") or "{}"
            try:
                idea_data = json.loads(sel_raw)
            except Exception:
                idea_data = {}
            title = idea_data.get("title") or t.get("theme_keyword") or "タイトル未設定"
            hook = idea_data.get("hook") or ""
            category = t.get("category") or "未分類"
            status = t.get("idea_status") or "未使用"

            st.markdown(f"**🏷️ {category}｜ステータス：{status}**")
            st.markdown(f"**タイトル：** {title}")
            if hook:
                st.markdown(f"📣 {hook}")
            if st.button(
                f"このアイデアを選ぶ ›",
                key=f"mobile_select_{theme_id}",
                use_container_width=True,
            ):
                st.session_state.selected_theme_id = theme_id
                st.session_state.selected_idea_title = title
                st.session_state.mobile_step = 2
                st.rerun()
            st.divider()

    elif step == 2:
        st.subheader("✍️ 台本を生成します")
        theme_id = st.session_state.get("selected_theme_id")
        if not theme_id:
            st.info("まずSTEP 1でアイデアを選択してください。")
            st.session_state.mobile_step = 1
            return
        try:
            res = (
                supabase.table("video_themes")
                .select("*")
                .eq("id", theme_id)
                .limit(1)
                .execute()
            )
            if getattr(res, "error", None):
                st.error(f"テーマ取得に失敗しました: {res.error}")
                return
            rows = res.data or []
            if not rows:
                st.error("選択されたテーマが見つかりません。")
                return
            theme_row = rows[0]
            selected_idea_json = theme_row.get("selected_idea") or "{}"
            selected_idea = json.loads(selected_idea_json)
        except Exception as e:
            st.error(f"テーマ取得中にエラーが発生しました: {e}")
            return

        title = selected_idea.get("title", "")
        hook = selected_idea.get("hook", "")
        st.markdown(f"**タイトル：** {title}")
        if hook:
            st.markdown(f"📣 {hook}")

        if st.button("← アイデアを選び直す", type="secondary"):
            st.session_state.mobile_step = 1
            st.rerun()

        if st.button("🎬 台本を自動生成する", use_container_width=True):
            with st.spinner("Geminiが台本を生成中..."):
                script_data = generate_script(selected_idea)
            if not script_data:
                st.error("台本の自動生成に失敗しました。")
            else:
                st.session_state.generated_script = script_data
                st.session_state.mobile_step = 3
                st.rerun()

    elif step == 3:
        st.subheader("✅ 台本を確認してください")
        script_data = st.session_state.get("generated_script") or {}
        if not script_data:
            st.info("まずSTEP 2で台本を生成してください。")
            st.session_state.mobile_step = 2
            return

        full_text = script_data.get("full_script") or ""
        if not full_text:
            full_text = "\n\n".join(
                [
                    f"【フック】\n{script_data.get('hook','')}",
                    f"【問題提示】\n{script_data.get('problem','')}",
                    f"【解決策】\n{script_data.get('solution','')}",
                    f"【CTA】\n{script_data.get('cta','')}",
                ]
            )
        edited_full = st.text_area("台本全体", value=full_text, height=300)

        col1, col2 = st.columns(2)
        with col1:
            if st.button("← 台本を再生成する", use_container_width=True):
                st.session_state.mobile_step = 2
                st.rerun()
        with col2:
            if st.button("💾 保存してプロジェクト化する", use_container_width=True):
                theme_id = st.session_state.get("selected_theme_id")
                if not theme_id:
                    st.error("アイデア情報が見つかりません。")
                    return
                try:
                    res = (
                        supabase.table("video_themes")
                        .select("*")
                        .eq("id", theme_id)
                        .limit(1)
                        .execute()
                    )
                    if getattr(res, "error", None):
                        st.error(f"テーマ取得に失敗しました: {res.error}")
                        return
                    rows = res.data or []
                    if not rows:
                        st.error("選択されたテーマが見つかりません。")
                        return
                    theme_row = rows[0]
                    selected_idea_json = theme_row.get("selected_idea") or "{}"
                    selected_idea = json.loads(selected_idea_json)
                except Exception as e:
                    st.error(f"テーマ取得中にエラーが発生しました: {e}")
                    return

                title = selected_idea.get("title")
                payload_script = {
                    "idea_id": theme_id,
                    "title": title,
                    "hook": script_data.get("hook"),
                    "problem": script_data.get("problem"),
                    "solution": script_data.get("solution"),
                    "cta": script_data.get("cta"),
                    "full_script": edited_full,
                    "language": "ja",
                    "status": "自動生成",
                }
                try:
                    res_script = (
                        supabase.table("video_scripts").insert(payload_script).execute()
                    )
                    if getattr(res_script, "error", None):
                        st.error(f"台本保存に失敗しました: {res_script.error}")
                        return
                    script_row = (res_script.data or [{}])[0]
                    script_id = script_row.get("id")
                except Exception as e:
                    st.error(f"台本保存中にエラーが発生しました: {e}")
                    return

                payload_project = {
                    "title": title,
                    "platform": "未設定",
                    "status": "撮影中",
                    "post_date": None,
                    "views": 0,
                    "inquiries": 0,
                    "memo": "スマホから作成",
                }
                try:
                    res_proj = (
                        supabase.table("video_projects")
                        .insert(payload_project)
                        .execute()
                    )
                    if getattr(res_proj, "error", None):
                        st.error(f"プロジェクト作成エラー: {res_proj.error}")
                        return
                except Exception as e:
                    st.error(f"プロジェクト作成エラー: {e}")
                    return

                st.success("保存完了！ダッシュボードで確認できます✨")
                st.session_state.mobile_step = 1
                st.session_state.project_created = True
                st.rerun()


def page_script() -> None:
    if st.session_state.get("view_mode", "PC / タブレット") == "スマホ":
        page_script_mobile()
    else:
        page_script_pc()


# -----------------------------
# Page 4: 進捗ダッシュボード
# -----------------------------
def page_dashboard() -> None:
    st.header("📊 進捗ダッシュボード")
    st.caption("テーマ〜台本〜動画プロジェクトの全体進捗を可視化します。")

    try:
        themes_res = supabase.table("video_themes").select("id, status").execute()
        scripts_res = supabase.table("video_scripts").select("id").execute()
        projects_res = supabase.table("video_projects").select("*").execute()
        if any(
            getattr(r, "error", None)
            for r in [themes_res, scripts_res, projects_res]
        ):
            st.error("ダッシュボード用データの取得に失敗しました。")
            return
        themes: List[Dict[str, Any]] = themes_res.data or []
        scripts: List[Dict[str, Any]] = scripts_res.data or []
        projects: List[Dict[str, Any]] = projects_res.data or []
    except Exception as e:
        st.error(f"ダッシュボードデータ取得中にエラーが発生しました: {e}")
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("テーマ数", len(themes))
    c2.metric("台本数", len(scripts))
    c3.metric("動画プロジェクト数", len(projects))
    posted_count = len([p for p in projects if p.get("status") == "投稿済み"])
    c4.metric("投稿済み本数", posted_count)

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("テーマのステータス分布")
        status_counts: Dict[str, int] = {}
        for t in themes:
            status = t.get("status") or "未設定"
            status_counts[status] = status_counts.get(status, 0) + 1
        if status_counts:
            st.bar_chart(status_counts)
        else:
            st.info("テーマがまだ登録されていません。")

    with col2:
        st.subheader("動画プロジェクト一覧")
        if projects:
            df = pd.DataFrame(projects)
            rename_map = {
                "title": "タイトル",
                "platform": "プラットフォーム",
                "status": "ステータス",
                "post_date": "投稿日",
                "views": "再生数",
                "inquiries": "問い合わせ数",
            }
            cols = [c for c in rename_map.keys() if c in df.columns]
            df_disp = df[cols].rename(columns=rename_map)
            st.dataframe(df_disp, use_container_width=True)
        else:
            st.info("動画プロジェクトがまだ登録されていません。")

    st.markdown("---")
    st.subheader("動画プロジェクトの登録 / 編集")

    with st.form("project_form"):
        project_id = st.text_input("ID（既存を更新する場合のみ指定。新規は空のまま）")
        title = st.text_input("タイトル")
        platform = st.selectbox(
            "プラットフォーム", ["YouTube", "TikTok", "Instagram", "その他"]
        )
        status = st.selectbox("ステータス", ["企画中", "撮影中", "編集中", "投稿済み"])
        post_date = st.date_input("投稿日（任意）", value=datetime.date.today())
        views = st.number_input("再生数", min_value=0, value=0)
        inquiries = st.number_input("問い合わせ数", min_value=0, value=0)
        notes = st.text_area("メモ")
        submitted = st.form_submit_button("保存")

    if submitted:
        if not title:
            st.warning("タイトルは必須です。")
        else:
            data = {
                "title": title,
                "platform": platform,
                "status": status,
                "post_date": post_date.isoformat() if post_date else None,
                "views": views,
                "inquiries": inquiries,
                "notes": notes,
            }
            try:
                if project_id:
                    res = (
                        supabase.table("video_projects")
                        .update(data)
                        .eq("id", int(project_id))
                        .execute()
                    )
                else:
                    res = supabase.table("video_projects").insert(data).execute()
                if getattr(res, "error", None):
                    st.error(f"保存に失敗しました: {res.error}")
                else:
                    st.success("動画プロジェクトを保存しました。")
                    st.rerun()
            except Exception as e:
                st.error(f"動画プロジェクト保存中にエラーが発生しました: {e}")


# -----------------------------
# メイン
# -----------------------------
def main() -> None:
    init_session_state()

    pages = [
        "⚙️ 塾プロフィール設定",
        "💡 テーマ & アイデア生成",
        "📝 台本 & 字幕 自動生成",
        "📊 進捗ダッシュボード",
    ]

    # current_page をページ配列にマッピングして index を決定
    try:
        current_index = pages.index(st.session_state.current_page)
    except ValueError:
        current_index = 0
        st.session_state.current_page = pages[0]

    with st.sidebar:
        st.title("未来塾 動画制作ラボ")
        selected_page = st.radio(
            "ページを選択",
            pages,
            index=current_index,
        )
        st.markdown("---")
        # アイデアテーブルの列幅はテーブル側で管理するため、この設定は保持のみ
        st.caption("管理者用・社内専用ツール")
        st.sidebar.divider()
        st.sidebar.caption("🖥️ 表示モード")
        view_mode = st.sidebar.radio(
            "",
            ["PC / タブレット", "スマホ"],
            index=0
            if st.session_state.get("view_mode", "PC / タブレット")
            == "PC / タブレット"
            else 1,
            key="view_mode_radio",
        )
        st.session_state["view_mode"] = view_mode

    # 選択結果を current_page に反映
    st.session_state.current_page = selected_page

    if selected_page == "⚙️ 塾プロフィール設定":
        page_profile()
    elif selected_page == "💡 テーマ & アイデア生成":
        page_ideas()
    elif selected_page == "📝 台本 & 字幕 自動生成":
        page_script()
    elif selected_page == "📊 進捗ダッシュボード":
        page_dashboard()


if __name__ == "__main__":
    main()

