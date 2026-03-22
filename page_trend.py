import streamlit as st
import pandas as pd
from tavily import TavilyClient
from google import genai


# ── クライアント取得 ──────────────────────────────────────────
def _get_tavily_client():
    try:
        return TavilyClient(api_key=st.secrets["tavily"]["api_key"])
    except Exception as e:
        st.error(f"Tavily APIキーの取得に失敗しました: {e}")
        return None


def _get_gemini_client():
    try:
        return genai.Client(api_key=st.secrets["gemini"]["api_key"])
    except Exception as e:
        st.error(f"Gemini APIキーの取得に失敗しました: {e}")
        return None


# ── トレンド検索 ──────────────────────────────────────────────
def _search_trends(query: str) -> str:
    client = _get_tavily_client()
    if not client:
        return ""
    try:
        result = client.search(
            query=query,
            search_depth="advanced",
            max_results=5,
            include_answer=True
        )
        texts = []
        if result.get("answer"):
            texts.append(f"概要: {result['answer']}")
        for r in result.get("results", []):
            texts.append(f"・{r.get('title', '')}: {r.get('content', '')[:200]}")
        return "\n".join(texts)
    except Exception as e:
        st.error(f"検索エラー: {e}")
        return ""


# ── Gemini アイデア生成 ───────────────────────────────────────
def _generate_ideas_from_trends(trend_text: str, keyword: str, categories=None) -> str:
    client = _get_gemini_client()
    if not client:
        return ""
    if categories:
        category_str = "／".join(categories)
    else:
        category_str = "子育て／日本語学習／生活情報／文化比較／教室紹介／学校生活／日本語会話フレーズ／季節イベント／医療・病院／保護者向け／SNSバズネタ／その他"
    prompt = f"""あなたは在日中国人向け日本語・中国語教室「未来塾」のSNSコンテンツ担当です。
以下のトレンド情報をもとに、未来塾のSNS動画コンテンツのアイデアを20件考えてください。
同じテーマの繰り返しは禁止し、以下カテゴリをバランスよく含めてください。

【カテゴリ一覧】{category_str}
【検索キーワード】{keyword}
【トレンド情報】{trend_text}

【出力形式】（必ずこの形式で20件出力）
1. タイトル: （動画タイトル）
   フック: （最初の一言・視聴者を引きつける文）
   カテゴリ: （上記カテゴリ一覧のいずれか）
2. タイトル: ..."""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        st.error(f"Gemini生成エラー: {e}")
        return ""


# ── テキスト解析 ──────────────────────────────────────────────
def _parse_ideas(text: str) -> list:
    ideas = []
    blocks = text.strip().split("\n\n")
    for block in blocks:
        lines = block.strip().split("\n")
        title = hook = ""
        category = "その他"
        for line in lines:
            if "タイトル:" in line:
                title = line.split("タイトル:")[-1].strip()
            elif "フック:" in line:
                hook = line.split("フック:")[-1].strip()
            elif "カテゴリ:" in line:
                category = line.split("カテゴリ:")[-1].strip()
        if title:
            ideas.append({"title": title, "hook": hook, "category": category})
    return ideas


# ── メインルーター ────────────────────────────────────────────
def page_trend(supabase) -> None:
    view_mode = st.session_state.get("view_mode", "PC / タブレット")
    if view_mode == "スマホ":
        page_trend_mobile(supabase)
    else:
        page_trend_pc(supabase)


# ── PC / タブレット版 ─────────────────────────────────────────
def page_trend_pc(supabase) -> None:
    st.header("🔍 トレンド調査 & アイデア自動生成")
    st.caption("最新トレンドからSNSコンテンツアイデアを自動生成してネタストックに追加します。")
    st.divider()

    col1, col2 = st.columns([2, 1])
    with col1:
        keyword = st.text_input(
            "🔎 検索キーワード",
            value="在日中国人 日本子育て トレンド",
            key="trend_keyword"
        )
    with col2:
        preset = st.selectbox(
            "プリセット",
            ["カスタム", "在日中国人 日本子育て", "日本語学習 中国人 トレンド",
             "小紅書 日本生活 人気", "在日外国人 学校生活 日本", "中国人ママ 日本 育児"],
            key="trend_preset"
        )
        if preset != "カスタム":
            keyword = preset

    st.divider()

    if st.button("🚀 トレンド調査 → アイデア生成", type="primary", use_container_width=True):
        if not keyword:
            st.warning("キーワードを入力してください。")
        else:
            with st.spinner("🔍 トレンドを調査中..."):
                trend_text = _search_trends(keyword)

            if trend_text:
                st.success("✅ トレンド情報を取得しました！")
                with st.expander("📄 取得したトレンド情報を見る"):
                    st.text(trend_text)

                raw_ideas = ""
                with st.spinner("✨ Geminiがアイデアを生成中..."):
                    try:
                        cat_data = supabase.table("idea_categories").select("name").execute().data or []
                        categories = [c["name"] for c in cat_data]
                    except Exception:
                        categories = None
                    raw_ideas = _generate_ideas_from_trends(trend_text, keyword, categories)

                if raw_ideas:
                    ideas = _parse_ideas(raw_ideas)
                    st.session_state["trend_ideas"] = ideas
                    st.rerun()
            else:
                st.error("トレンド情報の取得に失敗しました。")

    if st.session_state.get("trend_ideas"):
        ideas = st.session_state["trend_ideas"]
        st.subheader(f"💡 生成されたアイデア（{len(ideas)}件）")

        try:
            cat_data = supabase.table("idea_categories").select("name").execute().data or []
            category_names = [c["name"] for c in cat_data] + ["その他"]
        except Exception:
            category_names = ["子育て", "日本語学習", "生活情報", "文化比較",
                              "教室紹介", "学校生活", "その他"]

        selected_ideas = []
        for i, idea in enumerate(ideas):
            with st.container():
                col_check, col_content = st.columns([0.5, 9.5])
                with col_check:
                    checked = st.checkbox("", key=f"idea_check_{i}", value=True)
                with col_content:
                    st.markdown(f"**{idea['title']}**")
                    st.caption(f"🎣 {idea['hook']}")
                    idea["category"] = st.selectbox(
                        "カテゴリ",
                        category_names,
                        index=category_names.index(idea["category"])
                        if idea["category"] in category_names else 0,
                        key=f"idea_cat_{i}"
                    )
                if checked:
                    selected_ideas.append(idea)
                st.divider()

        col_save, col_clear = st.columns(2)
        with col_save:
            if st.button(
                f"💾 選択したアイデアをネタストックに追加（{len(selected_ideas)}件）",
                type="primary",
                use_container_width=True
            ):
                success_count = 0
                for idea in selected_ideas:
                    try:
                        supabase.table("video_themes").insert({
                            "title": idea["title"],
                            "hook": idea["hook"],
                            "category": idea["category"],
                            "idea_status": "アイデア",
                            "source": "トレンド調査"
                        }).execute()
                        success_count += 1
                    except Exception as e:
                        st.error(f"保存エラー: {e}")
                if success_count > 0:
                    st.success(f"✅ {success_count}件をネタストックに追加しました！")
                    st.session_state["trend_ideas"] = []
                    st.rerun()
        with col_clear:
            if st.button("🗑️ クリア", use_container_width=True):
                st.session_state["trend_ideas"] = []
                st.rerun()


# ── スマホ版 ──────────────────────────────────────────────────
def page_trend_mobile(supabase) -> None:
    st.header("🔍 トレンド調査")

    keyword = st.text_input(
        "検索キーワード",
        value="在日中国人 日本子育て トレンド",
        key="m_trend_keyword"
    )
    preset = st.selectbox(
        "プリセットから選ぶ",
        ["カスタム", "在日中国人 日本子育て", "日本語学習 中国人 トレンド",
         "小紅書 日本生活 人気", "在日外国人 学校生活 日本", "中国人ママ 日本 育児"],
        key="m_trend_preset"
    )
    if preset != "カスタム":
        keyword = preset

    if st.button("🚀 調査 → アイデア生成", type="primary", use_container_width=True):
        if not keyword:
            st.warning("キーワードを入力してください。")
        else:
            with st.spinner("調査中..."):
                trend_text = _search_trends(keyword)

            if trend_text:
                raw_ideas = ""
                with st.spinner("アイデア生成中..."):
                    try:
                        cat_data = supabase.table("idea_categories").select("name").execute().data or []
                        categories = [c["name"] for c in cat_data]
                    except Exception:
                        categories = None
                    raw_ideas = _generate_ideas_from_trends(trend_text, keyword, categories)

                if raw_ideas:
                    ideas = _parse_ideas(raw_ideas)
                    st.session_state["trend_ideas"] = ideas
                    st.rerun()
            else:
                st.error("取得失敗。再試行してください。")

    if st.session_state.get("trend_ideas"):
        ideas = st.session_state["trend_ideas"]
        st.subheader(f"💡 {len(ideas)}件のアイデア")

        for i, idea in enumerate(ideas):
            with st.container():
                st.markdown(f"**{idea['title']}**")
                st.caption(f"🎣 {idea['hook']}")
                if st.button("➕ 追加", key=f"m_add_{i}", use_container_width=True):
                    try:
                        supabase.table("video_themes").insert({
                            "title": idea["title"],
                            "hook": idea["hook"],
                            "category": idea["category"],
                            "idea_status": "アイデア",
                            "source": "トレンド調査"
                        }).execute()
                        st.success("✅ 追加しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"エラー: {e}")
                st.divider()

        if st.button("🗑️ クリア", use_container_width=True):
            st.session_state["trend_ideas"] = []
            st.rerun()
