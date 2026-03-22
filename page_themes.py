import streamlit as st

STATUS_LIST = ["アイデア", "企画中", "撮影待ち", "撮影済み", "投稿済み"]
STATUS_EMOJI = {
    "アイデア": "💡", "企画中": "🗒️", "撮影待ち": "🎥",
    "撮影済み": "✅", "投稿済み": "🚀"
}


def _get_categories(supabase) -> list:
    try:
        data = supabase.table("idea_categories").select("name").execute().data or []
        return [c["name"] for c in data]
    except Exception:
        return ["子育て", "日本語学習", "生活情報", "文化比較",
                "教室紹介", "学校生活", "日本語会話フレーズ",
                "季節イベント", "医療・病院", "保護者向け", "SNSバズネタ", "その他"]


def _render_status_flow(themes: list) -> None:
    counts = {s: sum(1 for t in themes if t.get("idea_status") == s) for s in STATUS_LIST}
    total = len(themes)
    cols = st.columns(len(STATUS_LIST))
    for i, status in enumerate(STATUS_LIST):
        with cols[i]:
            cnt = counts[status]
            pct = cnt / total if total > 0 else 0
            st.metric(f"{STATUS_EMOJI[status]} {status}", cnt)
            st.progress(pct)


def page_themes(supabase) -> None:
    view_mode = st.session_state.get("view_mode", "PC / タブレット")
    if view_mode == "スマホ":
        page_themes_mobile(supabase)
    else:
        page_themes_pc(supabase)


def page_themes_pc(supabase) -> None:
    st.header("📦 ネタストック")
    st.caption("アイデアの一覧・編集・ステータス管理をここで行います。")
    st.divider()

    categories = _get_categories(supabase)

    col_f1, col_f2, col_f3, col_f4 = st.columns([2, 2, 2, 3])
    with col_f1:
        filter_cat = st.selectbox("カテゴリ", ["すべて"] + categories, key="theme_filter_cat")
    with col_f2:
        filter_status = st.selectbox("ステータス", ["すべて"] + STATUS_LIST, key="theme_filter_status")
    with col_f3:
        filter_source = st.selectbox("ソース", ["すべて", "トレンド調査", "手動入力"], key="theme_filter_source")
    with col_f4:
        filter_keyword = st.text_input("🔎 キーワード検索", placeholder="タイトル・フックで検索", key="theme_filter_keyword")
    st.divider()

    try:
        themes = (
            supabase.table("video_themes")
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data or []
        )
    except Exception as e:
        st.error(f"データ取得エラー: {e}")
        themes = []

    _render_status_flow(themes)
    st.divider()

    filtered = themes
    if filter_cat != "すべて":
        filtered = [t for t in filtered if t.get("category") == filter_cat]
    if filter_status != "すべて":
        filtered = [t for t in filtered if t.get("idea_status") == filter_status]
    if filter_source != "すべて":
        filtered = [t for t in filtered if t.get("source") == filter_source]
    if filter_keyword:
        kw = filter_keyword.lower()
        filtered = [
            t for t in filtered
            if kw in (t.get("title", "") + t.get("hook", "") + t.get("category", "")).lower()
        ]

    if not filtered:
        st.info("表示するアイデアがありません。フィルターを変更するか、新しいアイデアを追加してください。")
    else:
        col_head, col_count = st.columns([8, 2])
        with col_head:
            st.subheader(f"💡 アイデア一覧（{len(filtered)}件）")
        with col_count:
            st.caption(f"全 {len(themes)} 件中")

        for theme in filtered:
            tid = theme.get("id", "")
            title = theme.get("title", "")
            hook = theme.get("hook", "")
            category = theme.get("category", "その他")
            status = theme.get("idea_status", "アイデア")
            source = theme.get("source", "")
            source_badge = "🔍" if source == "トレンド調査" else "✏️"

            with st.container(border=True):
                col_content, col_actions = st.columns([7, 3])

                with col_content:
                    st.markdown(f"**{title}**")
                    if hook:
                        st.caption(f"🎣 {hook}")
                    st.markdown(
                        f"`{category}` &nbsp;&nbsp; `{STATUS_EMOJI.get(status, '')}{status}` &nbsp;&nbsp; {source_badge} {source}",
                        unsafe_allow_html=True
                    )

                with col_actions:
                    new_status = st.selectbox(
                        "ステータス変更",
                        STATUS_LIST,
                        index=STATUS_LIST.index(status) if status in STATUS_LIST else 0,
                        key=f"status_{tid}",
                        label_visibility="collapsed"
                    )
                    if new_status != status:
                        try:
                            supabase.table("video_themes").update(
                                {"idea_status": new_status}
                            ).eq("id", tid).execute()
                            st.success("✅ 更新しました！")
                            st.rerun()
                        except Exception as e:
                            st.error(f"更新エラー: {e}")

                    col_proj, col_del = st.columns(2)
                    with col_proj:
                        if st.button("🎬 プロジェクト化", key=f"proj_{tid}", use_container_width=True):
                            try:
                                supabase.table("video_projects").insert({
                                    "title": title,
                                    "memo": hook,
                                    "platform": "未定",
                                    "status": "撮影中"
                                }).execute()
                                supabase.table("video_themes").update(
                                    {"idea_status": "撮影待ち"}
                                ).eq("id", tid).execute()
                                st.success(f"🎬 プロジェクト化しました！")
                                st.rerun()
                            except Exception as e:
                                st.error(f"プロジェクト化エラー: {e}")
                    with col_del:
                        if st.button("🗑️ 削除", key=f"del_{tid}", use_container_width=True):
                            try:
                                supabase.table("video_themes").delete().eq("id", tid).execute()
                                st.success("🗑️ 削除しました")
                                st.rerun()
                            except Exception as e:
                                st.error(f"削除エラー: {e}")

    st.divider()

    with st.expander("➕ 手動でアイデアを追加", expanded=False):
        with st.form("add_theme_form"):
            new_title = st.text_input("タイトル *", placeholder="動画タイトルを入力")
            new_hook = st.text_input("フック（最初の一言）", placeholder="視聴者を引きつける一言")
            new_cat = st.selectbox("カテゴリ", categories)
            submitted = st.form_submit_button("➕ 追加", type="primary", use_container_width=True)
            if submitted:
                if not new_title:
                    st.warning("タイトルは必須です。")
                else:
                    try:
                        supabase.table("video_themes").insert({
                            "title": new_title,
                            "hook": new_hook,
                            "category": new_cat,
                            "idea_status": "アイデア",
                            "source": "手動入力"
                        }).execute()
                        st.success(f"✅ 「{new_title}」を追加しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"追加エラー: {e}")


def page_themes_mobile(supabase) -> None:
    st.header("📦 ネタストック")

    col_f1, col_f2 = st.columns(2)
    with col_f1:
        filter_status = st.selectbox("ステータス", ["すべて"] + STATUS_LIST, key="m_theme_filter_status")
    with col_f2:
        filter_keyword = st.text_input("🔎 検索", placeholder="キーワードで絞り込み", key="m_theme_filter_kw")

    try:
        themes = (
            supabase.table("video_themes")
            .select("*")
            .order("created_at", desc=True)
            .execute()
            .data or []
        )
    except Exception as e:
        st.error(f"エラー: {e}")
        themes = []

    filtered = themes
    if filter_status != "すべて":
        filtered = [t for t in filtered if t.get("idea_status") == filter_status]
    if filter_keyword:
        kw = filter_keyword.lower()
        filtered = [
            t for t in filtered
            if kw in (t.get("title", "") + t.get("hook", "")).lower()
        ]

    st.caption(f"{len(filtered)} 件表示中 / 全 {len(themes)} 件")
    st.divider()

    for theme in filtered:
        tid = theme.get("id", "")
        title = theme.get("title", "")
        hook = theme.get("hook", "")
        category = theme.get("category", "")
        status = theme.get("idea_status", "アイデア")

        with st.container(border=True):
            st.markdown(f"**{title}**")
            if hook:
                st.caption(f"🎣 {hook}")
            st.caption(f"{category} | {STATUS_EMOJI.get(status, '')}{status}")

            new_status = st.selectbox(
                "ステータス変更",
                STATUS_LIST,
                index=STATUS_LIST.index(status) if status in STATUS_LIST else 0,
                key=f"m_status_{tid}",
                label_visibility="collapsed"
            )
            if new_status != status:
                try:
                    supabase.table("video_themes").update(
                        {"idea_status": new_status}
                    ).eq("id", tid).execute()
                    st.success("✅ 更新しました！")
                    st.rerun()
                except Exception as e:
                    st.error(f"更新エラー: {e}")

            if st.button("🎬 プロジェクト化", key=f"m_proj_{tid}", use_container_width=True):
                try:
                    supabase.table("video_projects").insert({
                        "title": title,
                        "memo": hook,
                        "platform": "未定",
                        "status": "撮影中"
                    }).execute()
                    supabase.table("video_themes").update(
                        {"idea_status": "撮影待ち"}
                    ).eq("id", tid).execute()
                    st.success("🎬 プロジェクト化しました！")
                    st.rerun()
                except Exception as e:
                    st.error(f"エラー: {e}")

    st.divider()
    with st.expander("➕ アイデアを追加"):
        categories = _get_categories(supabase)
        with st.form("m_add_theme_form"):
            m_title = st.text_input("タイトル *")
            m_hook = st.text_input("フック")
            m_cat = st.selectbox("カテゴリ", categories)
            if st.form_submit_button("➕ 追加", type="primary", use_container_width=True):
                if not m_title:
                    st.warning("タイトルは必須です。")
                else:
                    try:
                        supabase.table("video_themes").insert({
                            "title": m_title,
                            "hook": m_hook,
                            "category": m_cat,
                            "idea_status": "アイデア",
                            "source": "手動入力"
                        }).execute()
                        st.success("✅ 追加しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"エラー: {e}")
