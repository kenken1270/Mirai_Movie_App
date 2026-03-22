import streamlit as st
import pandas as pd
from datetime import date


def page_dashboard(supabase) -> None:
    view_mode = st.session_state.get("view_mode", "PC / タブレット")
    if view_mode == "スマホ":
        page_dashboard_mobile(supabase)
    else:
        page_dashboard_pc(supabase)


def page_dashboard_pc(supabase) -> None:
    st.header("📊 進捗ダッシュボード")
    st.caption("プロジェクトの進捗・数値を管理します。")
    try:
        themes = supabase.table("video_themes").select("id, idea_status").execute().data or []
        scripts = supabase.table("video_scripts").select("id").execute().data or []
        projects = supabase.table("video_projects").select("id, status").execute().data or []
    except Exception as e:
        st.error(f"データ取得エラー: {e}")
        return
    posted_count = sum(1 for p in projects if p.get("status") == "投稿済み")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("💡 アイデア数", len(themes))
    c2.metric("📝 台本数", len(scripts))
    c3.metric("🎬 プロジェクト数", len(projects))
    c4.metric("✅ 投稿済み", posted_count)
    st.divider()
    col_left, col_right = st.columns(2)
    with col_left:
        st.subheader("📈 テーマステータス分布")
        if themes:
            status_counts = {}
            for t in themes:
                s = t.get("idea_status", "不明")
                status_counts[s] = status_counts.get(s, 0) + 1
            df_chart = pd.DataFrame({
                "ステータス": list(status_counts.keys()),
                "件数": list(status_counts.values())
            })
            st.bar_chart(df_chart.set_index("ステータス"))
        else:
            st.info("テーマデータがありません。")
    with col_right:
        st.subheader("🎬 プロジェクトステータス")
        for label in ["撮影中", "投稿前（撮影済み）", "投稿済み"]:
            cnt = sum(1 for p in projects if p.get("status") == label)
            st.metric(label, cnt)
    st.divider()
    st.subheader("📋 プロジェクト一覧")
    try:
        project_list = supabase.table("video_projects").select("*").order("created_at", desc=True).execute().data or []
    except Exception as e:
        st.error(f"プロジェクト取得エラー: {e}")
        project_list = []
    status_emoji = {"撮影中": "🎥", "投稿前（撮影済み）": "📦", "投稿済み": "✅"}
    for proj in project_list:
        pid = proj.get("id")
        title = proj.get("title", "タイトルなし")
        status = proj.get("status", "撮影中")
        platform = proj.get("platform", "")
        emoji = status_emoji.get(status, "📁")
        with st.expander(f"{emoji} {title}  [{platform}]  ― {status}"):
            col_edit, col_metric = st.columns([2, 3])
            with col_edit:
                st.markdown("**✏️ プロジェクト編集**")
                new_title = st.text_input("タイトル", value=title, key=f"title_{pid}")
                new_platform = st.selectbox(
                    "プラットフォーム",
                    ["YouTube", "TikTok", "Instagram", "その他"],
                    index=["YouTube", "TikTok", "Instagram", "その他"].index(platform)
                    if platform in ["YouTube", "TikTok", "Instagram", "その他"] else 0,
                    key=f"platform_{pid}"
                )
                new_status = st.selectbox(
                    "ステータス",
                    ["撮影中", "投稿前（撮影済み）", "投稿済み"],
                    index=["撮影中", "投稿前（撮影済み）", "投稿済み"].index(status)
                    if status in ["撮影中", "投稿前（撮影済み）", "投稿済み"] else 0,
                    key=f"status_{pid}"
                )
                new_date = st.date_input(
                    "投稿予定日", key=f"date_{pid}",
                    value=date.fromisoformat(proj["scheduled_date"]) if proj.get("scheduled_date") else date.today()
                )
                new_memo = st.text_area("メモ", value=proj.get("memo", ""), key=f"memo_{pid}", height=80)
                if st.button("💾 更新する", key=f"update_{pid}"):
                    try:
                        supabase.table("video_projects").update({
                            "title": new_title,
                            "platform": new_platform,
                            "status": new_status,
                            "scheduled_date": new_date.isoformat(),
                            "memo": new_memo
                        }).eq("id", pid).execute()
                        st.success("✅ 更新しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"更新エラー: {e}")
                st.divider()
                if st.button("🗑️ このプロジェクトを削除する", key=f"delete_{pid}", type="secondary", use_container_width=True):
                    if st.session_state.get(f"confirm_delete_{pid}"):
                        try:
                            supabase.table("project_metrics").delete().eq("project_id", pid).execute()
                            supabase.table("video_projects").delete().eq("id", pid).execute()
                            st.success("🗑️ プロジェクトを削除しました。")
                            st.session_state.pop(f"confirm_delete_{pid}", None)
                            st.rerun()
                        except Exception as e:
                            st.error(f"削除エラー: {e}")
                    else:
                        st.session_state[f"confirm_delete_{pid}"] = True
                        st.warning("⚠️ もう一度ボタンを押すと削除されます。")
            with col_metric:
                st.markdown("**📊 数値を記録する**")
                m_date = st.date_input("記録日", value=date.today(), key=f"mdate_{pid}")
                m_views = st.number_input("視聴回数", min_value=0, value=0, key=f"views_{pid}")
                m_likes = st.number_input("いいね数", min_value=0, value=0, key=f"likes_{pid}")
                m_comments = st.number_input("コメント数", min_value=0, value=0, key=f"comments_{pid}")
                m_memo = st.text_input("メモ（任意）", key=f"mmemo_{pid}")
                if st.button("📥 記録する", key=f"record_{pid}"):
                    try:
                        supabase.table("project_metrics").insert({
                            "project_id": pid,
                            "recorded_date": m_date.isoformat(),
                            "views": m_views,
                            "likes": m_likes,
                            "comments": m_comments,
                            "memo": m_memo
                        }).execute()
                        st.success("✅ 記録しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"記録エラー: {e}")
                st.markdown("**📈 推移グラフ**")
                try:
                    metrics_data = supabase.table("project_metrics").select("*").eq("project_id", pid).order("recorded_date").execute().data or []
                    if metrics_data:
                        df_m = pd.DataFrame(metrics_data)
                        df_m = df_m[["recorded_date", "views", "likes", "comments"]].rename(columns={
                            "recorded_date": "日付", "views": "視聴回数", "likes": "いいね", "comments": "コメント"
                        })
                        st.line_chart(df_m.set_index("日付"))
                    else:
                        st.info("まだ記録がありません。")
                except Exception as e:
                    st.error(f"グラフ取得エラー: {e}")
    st.divider()
    with st.expander("➕ 新規プロジェクトを登録する"):
        with st.form("new_project_form"):
            np_title = st.text_input("タイトル")
            np_platform = st.selectbox("プラットフォーム", ["YouTube", "TikTok", "Instagram", "その他"])
            np_status = st.selectbox("ステータス", ["撮影中", "投稿前（撮影済み）", "投稿済み"])
            np_date = st.date_input("投稿予定日", value=date.today())
            np_memo = st.text_area("メモ", height=80)
            submitted = st.form_submit_button("🎬 登録する")
            if submitted:
                if not np_title:
                    st.warning("タイトルを入力してください。")
                else:
                    try:
                        supabase.table("video_projects").insert({
                            "title": np_title,
                            "platform": np_platform,
                            "status": np_status,
                            "scheduled_date": np_date.isoformat(),
                            "memo": np_memo
                        }).execute()
                        st.success("✅ プロジェクトを登録しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"登録エラー: {e}")

    page_dashboard_buzzwords(supabase)


def page_dashboard_mobile(supabase) -> None:
    st.header("📊 ダッシュボード")
    try:
        themes = supabase.table("video_themes").select("id").execute().data or []
        scripts = supabase.table("video_scripts").select("id").execute().data or []
        projects = supabase.table("video_projects").select("id, status").execute().data or []
    except Exception as e:
        st.error(f"データ取得エラー: {e}")
        return
    posted_count = sum(1 for p in projects if p.get("status") == "投稿済み")
    col1, col2 = st.columns(2)
    col1.metric("💡 アイデア", len(themes))
    col2.metric("📝 台本", len(scripts))
    col3, col4 = st.columns(2)
    col3.metric("🎬 プロジェクト", len(projects))
    col4.metric("✅ 投稿済み", posted_count)
    st.divider()
    st.subheader("📋 プロジェクト")
    try:
        project_list = supabase.table("video_projects").select("*").order("created_at", desc=True).execute().data or []
    except Exception as e:
        st.error(f"取得エラー: {e}")
        project_list = []
    status_emoji = {"撮影中": "🎥", "投稿前（撮影済み）": "📦", "投稿済み": "✅"}
    for proj in project_list:
        pid = proj.get("id")
        title = proj.get("title", "タイトルなし")
        status = proj.get("status", "撮影中")
        platform = proj.get("platform", "")
        emoji = status_emoji.get(status, "📁")
        with st.container():
            st.markdown(f"### {emoji} {title}")
            st.caption(f"{platform} ― {status}")
            new_status = st.selectbox(
                "ステータス変更",
                ["撮影中", "投稿前（撮影済み）", "投稿済み"],
                index=["撮影中", "投稿前（撮影済み）", "投稿済み"].index(status)
                if status in ["撮影中", "投稿前（撮影済み）", "投稿済み"] else 0,
                key=f"m_status_{pid}"
            )
            if st.button("💾 ステータス更新", key=f"m_update_{pid}"):
                try:
                    supabase.table("video_projects").update({"status": new_status}).eq("id", pid).execute()
                    st.success("✅ 更新しました！")
                    st.rerun()
                except Exception as e:
                    st.error(f"更新エラー: {e}")
            if st.button("🗑️ 削除", key=f"m_delete_{pid}", use_container_width=True):
                if st.session_state.get(f"m_confirm_delete_{pid}"):
                    try:
                        supabase.table("project_metrics").delete().eq("project_id", pid).execute()
                        supabase.table("video_projects").delete().eq("id", pid).execute()
                        st.success("🗑️ 削除しました。")
                        st.session_state.pop(f"m_confirm_delete_{pid}", None)
                        st.rerun()
                    except Exception as e:
                        st.error(f"削除エラー: {e}")
                else:
                    st.session_state[f"m_confirm_delete_{pid}"] = True
                    st.warning("⚠️ もう一度押すと削除されます。")
            with st.expander("📊 数値を記録する"):
                m_date = st.date_input("記録日", value=date.today(), key=f"mm_date_{pid}")
                m_views = st.number_input("視聴回数", min_value=0, value=0, key=f"mm_views_{pid}")
                m_likes = st.number_input("いいね数", min_value=0, value=0, key=f"mm_likes_{pid}")
                m_comments = st.number_input("コメント数", min_value=0, value=0, key=f"mm_comments_{pid}")
                if st.button("📥 記録する", key=f"mm_record_{pid}"):
                    try:
                        supabase.table("project_metrics").insert({
                            "project_id": pid,
                            "recorded_date": m_date.isoformat(),
                            "views": m_views,
                            "likes": m_likes,
                            "comments": m_comments
                        }).execute()
                        st.success("✅ 記録しました！")
                        st.rerun()
                    except Exception as e:
                        st.error(f"記録エラー: {e}")
            st.divider()
    with st.expander("➕ 新規プロジェクト登録"):
        np_title = st.text_input("タイトル", key="m_np_title")
        np_platform = st.selectbox("プラットフォーム", ["YouTube", "TikTok", "Instagram", "その他"], key="m_np_platform")
        np_status = st.selectbox("ステータス", ["撮影中", "投稿前（撮影済み）", "投稿済み"], key="m_np_status")
        np_memo = st.text_area("メモ", key="m_np_memo", height=80)
        if st.button("🎬 登録する", key="m_np_submit"):
            if not np_title:
                st.warning("タイトルを入力してください。")
            else:
                try:
                    supabase.table("video_projects").insert({
                        "title": np_title,
                        "platform": np_platform,
                        "status": np_status,
                        "memo": np_memo
                    }).execute()
                    st.success("✅ 登録しました！")
                    st.rerun()
                except Exception as e:
                    st.error(f"登録エラー: {e}")


def page_dashboard_buzzwords(supabase):
    """バズワード分析セクション"""
    st.divider()
    st.subheader("📊 バズワード分析")
    st.caption("トレンド調査で記録したハッシュタグの出現頻度と推移を確認できます。")

    try:
        bw_data = supabase.table("trend_buzzwords").select("*").order("recorded_date", desc=True).execute().data or []
    except Exception as e:
        st.error(f"データ取得エラー: {e}")
        bw_data = []

    if not bw_data:
        st.info("まだバズワードが記録されていません。トレンド調査ページで記録してください。")
        return

    from collections import Counter

    # 記録一覧テーブル
    with st.expander("📋 記録一覧を見る", expanded=False):
        rows = []
        for row in bw_data:
            rows.append({
                "日付": row.get("recorded_date", ""),
                "キーワード": row.get("keyword", ""),
                "バズワード数": len(row.get("buzzwords", [])),
                "バズワード": " ".join(row.get("buzzwords", [])),
            })
        df_list = pd.DataFrame(rows)
        st.dataframe(df_list, use_container_width=True)

    # 出現頻度ランキング
    all_words = []
    for row in bw_data:
        all_words.extend(row.get("buzzwords", []))
    word_count = Counter(all_words)
    df_rank = pd.DataFrame(
        word_count.most_common(20),
        columns=["ハッシュタグ", "出現回数"]
    )
    st.markdown("**🏆 出現頻度ランキング TOP20**")
    st.bar_chart(df_rank.set_index("ハッシュタグ"))

    # 時系列：上位5ワードの推移
    top5 = [w for w, _ in word_count.most_common(5)]
    timeline_rows = []
    for row in bw_data:
        date_val = row.get("recorded_date", "")
        words = row.get("buzzwords", [])
        for w in top5:
            timeline_rows.append({
                "日付": date_val,
                "ワード": w,
                "登場": 1 if w in words else 0,
            })
    if timeline_rows:
        df_time = pd.DataFrame(timeline_rows)
        df_pivot = df_time.groupby(["日付", "ワード"])["登場"].sum().unstack(fill_value=0)
        st.markdown("**📈 上位5ワードの時系列推移**")
        st.line_chart(df_pivot)
