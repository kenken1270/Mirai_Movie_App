import datetime
from typing import List, Optional

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
    if "selected_idea_id" not in st.session_state:
        st.session_state.selected_idea_id: Optional[int] = None
    if "selected_script_id" not in st.session_state:
        st.session_state.selected_script_id: Optional[int] = None


def format_datetime(dt_str: Optional[str]) -> str:
    if not dt_str:
        return "-"
    try:
        # Supabase標準のタイムスタンプ形式を想定
        dt = datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return dt_str


# -----------------------------
# ページ1: ネタバンク
# -----------------------------
def page_idea_bank() -> None:
    st.header("💡 ネタバンク")
    st.caption("動画ネタ（アイデア）を一元管理するページです。")

    col_form, col_list = st.columns([2, 3])

    with col_form:
        st.subheader("新規ネタを登録")
        with st.form("idea_form", clear_on_submit=True):
            title = st.text_input("タイトル")
            target = st.text_input("ターゲット（例：経営者、受験生 など）")
            genre = st.text_input("ジャンル（例：マーケ、受験、雑談）")
            memo = st.text_area("メモ")
            status = st.selectbox(
                "ステータス",
                ["アイデア", "構成中", "台本作成中", "撮影済み", "公開済み"],
                index=0,
            )
            submitted = st.form_submit_button("登録")

        if submitted:
            if not title:
                st.warning("タイトルは必須です。")
            else:
                try:
                    res = (
                        supabase.table("video_ideas")
                        .insert(
                            {
                                "title": title,
                                "target": target,
                                "genre": genre,
                                "memo": memo,
                                "status": status,
                            }
                        )
                        .execute()
                    )
                    if getattr(res, "error", None):
                        st.error(f"登録に失敗しました: {res.error}")
                    else:
                        st.success("ネタを登録しました。")
                        st.experimental_rerun()
                except Exception as e:
                    st.error(f"ネタ登録中にエラーが発生しました: {e}")

    with col_list:
        st.subheader("ネタ一覧")

        # フィルタ
        filter_col1, filter_col2 = st.columns(2)
        with filter_col1:
            status_filter = st.multiselect(
                "ステータスで絞り込み",
                ["アイデア", "構成中", "台本作成中", "撮影済み", "公開済み"],
            )
        with filter_col2:
            keyword = st.text_input("キーワード検索（タイトル・メモ）")

        try:
            query = supabase.table("video_ideas").select("*").order("created_at", desc=True)
            if status_filter:
                query = query.in_("status", status_filter)  # type: ignore[attr-defined]
            res = query.execute()
            if getattr(res, "error", None):
                st.error(f"取得に失敗しました: {res.error}")
                return
            ideas: List[dict] = res.data or []
        except Exception as e:
            st.error(f"ネタ取得中にエラーが発生しました: {e}")
            ideas = []

        # キーワードフィルタ（クライアント側）
        if keyword:
            keyword_lower = keyword.lower()
            ideas = [
                i
                for i in ideas
                if keyword_lower in (i.get("title") or "").lower()
                or keyword_lower in (i.get("memo") or "").lower()
            ]

        if not ideas:
            st.info("ネタがまだ登録されていません。")
            return

        for idea in ideas:
            with st.container(border=True):
                cols = st.columns([4, 2, 2, 2])
                cols[0].markdown(f"**{idea.get('title', '')}**")
                cols[1].markdown(f"ターゲット：{idea.get('target') or '-'}")
                cols[2].markdown(f"ジャンル：{idea.get('genre') or '-'}")
                cols[3].markdown(f"ステータス：`{idea.get('status') or '- '}`")
                st.caption(
                    f"作成日：{format_datetime(idea.get('created_at'))}｜メモ：{idea.get('memo') or '-'}"
                )

                action_col1, action_col2, action_col3 = st.columns(3)
                with action_col1:
                    if st.button(
                        "台本ビルダーで開く",
                        key=f"open_script_{idea['id']}",
                    ):
                        st.session_state.selected_idea_id = idea["id"]
                        st.session_state.page = "📝 台本ビルダー"
                        st.experimental_rerun()
                with action_col2:
                    new_status = st.selectbox(
                        "ステータス変更",
                        ["アイデア", "構成中", "台本作成中", "撮影済み", "公開済み"],
                        index=[
                            "アイデア",
                            "構成中",
                            "台本作成中",
                            "撮影済み",
                            "公開済み",
                        ].index(idea.get("status") or "アイデア"),
                        key=f"status_{idea['id']}",
                    )
                    if new_status != idea.get("status"):
                        try:
                            res = (
                                supabase.table("video_ideas")
                                .update({"status": new_status})
                                .eq("id", idea["id"])
                                .execute()
                            )
                            if getattr(res, "error", None):
                                st.error(f"ステータス更新に失敗しました: {res.error}")
                            else:
                                st.success("ステータスを更新しました。")
                                st.experimental_rerun()
                        except Exception as e:
                            st.error(f"ステータス更新中にエラーが発生しました: {e}")
                with action_col3:
                    if st.button(
                        "削除",
                        key=f"delete_idea_{idea['id']}",
                    ):
                        try:
                            res = (
                                supabase.table("video_ideas")
                                .delete()
                                .eq("id", idea["id"])
                                .execute()
                            )
                            if getattr(res, "error", None):
                                st.error(f"削除に失敗しました: {res.error}")
                            else:
                                st.success("ネタを削除しました。")
                                st.experimental_rerun()
                        except Exception as e:
                            st.error(f"削除中にエラーが発生しました: {e}")


# -----------------------------
# ページ2: 台本ビルダー
# -----------------------------
def page_script_builder() -> None:
    st.header("📝 台本ビルダー")
    st.caption("ネタから台本（フレームワーク付き）を作成・管理するページです。")

    # アイデアの選択
    st.subheader("元ネタを選択")
    try:
        res_ideas = (
            supabase.table("video_ideas")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        if getattr(res_ideas, "error", None):
            st.error(f"ネタ取得に失敗しました: {res_ideas.error}")
            ideas: List[dict] = []
        else:
            ideas = res_ideas.data or []
    except Exception as e:
        st.error(f"ネタ取得中にエラーが発生しました: {e}")
        ideas = []

    idea_options = {f"{i['id']}｜{i['title']}": i["id"] for i in ideas}
    default_index = 0
    if st.session_state.get("selected_idea_id") is not None:
        for idx, (label, iid) in enumerate(idea_options.items()):
            if iid == st.session_state.selected_idea_id:
                default_index = idx
                break

    selected_label = None
    if idea_options:
        selected_label = st.selectbox(
            "ネタを選択",
            list(idea_options.keys()),
            index=default_index,
        )
        selected_idea_id = idea_options[selected_label]
        st.session_state.selected_idea_id = selected_idea_id
    else:
        st.info("まず「ネタバンク」でネタを登録してください。")
        return

    # 選択中ネタの情報
    current_idea = next((i for i in ideas if i["id"] == st.session_state.selected_idea_id), None)
    if current_idea:
        with st.expander("選択中ネタの詳細", expanded=False):
            st.markdown(f"**タイトル：** {current_idea.get('title')}")
            st.markdown(f"**ターゲット：** {current_idea.get('target') or '-'}")
            st.markdown(f"**ジャンル：** {current_idea.get('genre') or '-'}")
            st.markdown(f"**メモ：** {current_idea.get('memo') or '-'}")
            st.markdown(f"**ステータス：** {current_idea.get('status') or '-'}")

    st.divider()

    # 台本一覧と編集
    left, right = st.columns([2, 3])

    with left:
        st.subheader("台本一覧")
        try:
            res_scripts = (
                supabase.table("video_scripts")
                .select("*")
                .eq("idea_id", st.session_state.selected_idea_id)
                .order("created_at", desc=True)
                .execute()
            )
            if getattr(res_scripts, "error", None):
                st.error(f"台本取得に失敗しました: {res_scripts.error}")
                scripts: List[dict] = []
            else:
                scripts = res_scripts.data or []
        except Exception as e:
            st.error(f"台本取得中にエラーが発生しました: {e}")
            scripts = []

        script_labels = {f"{s['id']}｜{s['title']}": s["id"] for s in scripts}

        selected_script_label = None
        if script_labels:
            default_script_index = 0
            if st.session_state.get("selected_script_id") is not None:
                for idx, (label, sid) in enumerate(script_labels.items()):
                    if sid == st.session_state.selected_script_id:
                        default_script_index = idx
                        break

            selected_script_label = st.selectbox(
                "台本を選択",
                list(script_labels.keys()),
                index=default_script_index,
            )
            st.session_state.selected_script_id = script_labels[selected_script_label]
        else:
            st.info("このネタに紐づく台本はまだありません。右側から新規作成できます。")

    with right:
        st.subheader("台本編集 / 新規作成")
        mode = st.radio("モードを選択", ["新規作成", "既存を編集"], horizontal=True)

        if mode == "既存を編集" and not scripts:
            st.warning("編集できる台本がありません。")
            return

        editing_script = None
        if mode == "既存を編集" and st.session_state.get("selected_script_id") is not None:
            editing_script = next(
                (s for s in scripts if s["id"] == st.session_state.selected_script_id),
                None,
            )

        with st.form("script_form"):
            title = st.text_input(
                "動画タイトル",
                value=(editing_script.get("title") if editing_script else ""),
            )
            hook = st.text_area(
                "フック（冒頭のつかみ）",
                value=(editing_script.get("hook") if editing_script else ""),
            )
            problem = st.text_area(
                "問題提起（Problem）",
                value=(editing_script.get("problem") if editing_script else ""),
            )
            solution = st.text_area(
                "解決策・本編（Solution）",
                value=(editing_script.get("solution") if editing_script else ""),
            )
            cta = st.text_area(
                "CTA（行動喚起）",
                value=(editing_script.get("cta") if editing_script else ""),
            )
            language = st.selectbox(
                "言語",
                ["ja", "zh", "en"],
                index=0
                if not editing_script
                else ["ja", "zh", "en"].index(editing_script.get("language", "ja")),
            )
            status = st.selectbox(
                "ステータス",
                ["ドラフト", "レビュー中", "確定"],
                index=0
                if not editing_script
                else ["ドラフト", "レビュー中", "確定"].index(
                    editing_script.get("status", "ドラフト")
                ),
            )

            # フル台本は上記を連結して生成し、必要なら手動調整
            default_full = ""
            if editing_script and editing_script.get("full_script"):
                default_full = editing_script["full_script"]
            else:
                default_full = "\n\n".join(
                    [
                        f"【フック】\n{hook}",
                        f"【問題提起】\n{problem}",
                        f"【解決策】\n{solution}",
                        f"【CTA】\n{cta}",
                    ]
                )
            full_script = st.text_area("フル台本", value=default_full, height=250)

            submitted = st.form_submit_button("保存")

        if submitted:
            if not title:
                st.warning("動画タイトルは必須です。")
                return
            data = {
                "idea_id": st.session_state.selected_idea_id,
                "title": title,
                "hook": hook,
                "problem": problem,
                "solution": solution,
                "cta": cta,
                "full_script": full_script,
                "language": language,
                "status": status,
            }
            try:
                if mode == "新規作成" or not editing_script:
                    res = supabase.table("video_scripts").insert(data).execute()
                else:
                    res = (
                        supabase.table("video_scripts")
                        .update(data)
                        .eq("id", editing_script["id"])
                        .execute()
                    )
                if getattr(res, "error", None):
                    st.error(f"保存に失敗しました: {res.error}")
                else:
                    st.success("台本を保存しました。")
                    if mode == "新規作成":
                        st.session_state.selected_script_id = res.data[0]["id"]  # type: ignore[index]
                    st.experimental_rerun()
            except Exception as e:
                st.error(f"台本保存中にエラーが発生しました: {e}")


# -----------------------------
# ページ3: 字幕エディタ（SRTエクスポート）
# -----------------------------
def generate_srt(subtitles: List[dict]) -> str:
    lines: List[str] = []
    for idx, row in enumerate(subtitles, start=1):
        start = row.get("start_sec") or 0
        end = row.get("end_sec") or 0
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


def page_subtitle_editor() -> None:
    st.header("💬 字幕エディタ")
    st.caption("台本に紐づく字幕を管理し、SRTとしてエクスポートするページです。")

    # 台本選択
    try:
        res_scripts = (
            supabase.table("video_scripts")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        if getattr(res_scripts, "error", None):
            st.error(f"台本取得に失敗しました: {res_scripts.error}")
            scripts: List[dict] = []
        else:
            scripts = res_scripts.data or []
    except Exception as e:
        st.error(f"台本取得中にエラーが発生しました: {e}")
        scripts = []

    if not scripts:
        st.info("まず「台本ビルダー」で台本を作成してください。")
        return

    script_labels = {f"{s['id']}｜{s['title']}": s["id"] for s in scripts}

    default_index = 0
    if st.session_state.get("selected_script_id") is not None:
        for idx, (label, sid) in enumerate(script_labels.items()):
            if sid == st.session_state.selected_script_id:
                default_index = idx
                break

    selected_label = st.selectbox(
        "台本を選択",
        list(script_labels.keys()),
        index=default_index,
    )
    script_id = script_labels[selected_label]
    st.session_state.selected_script_id = script_id

    st.divider()

    # 字幕一覧取得
    try:
        res_subs = (
            supabase.table("video_subtitles")
            .select("*")
            .eq("script_id", script_id)
            .order("order_num", asc=True)
            .execute()
        )
        if getattr(res_subs, "error", None):
            st.error(f"字幕取得に失敗しました: {res_subs.error}")
            subtitles: List[dict] = []
        else:
            subtitles = res_subs.data or []
    except Exception as e:
        st.error(f"字幕取得中にエラーが発生しました: {e}")
        subtitles = []

    col_edit, col_export = st.columns([3, 2])

    with col_edit:
        st.subheader("字幕一覧 / 編集")
        with st.form("subtitle_form"):
            new_rows: List[dict] = []
            max_existing_order = 0
            for row in subtitles:
                max_existing_order = max(max_existing_order, row.get("order_num") or 0)
                with st.expander(f"#{row.get('order_num')} {row.get('text_ja')[:20]}...", expanded=False):
                    c1, c2, c3 = st.columns(3)
                    start_sec = c1.number_input(
                        "開始秒",
                        min_value=0.0,
                        value=float(row.get("start_sec") or 0),
                        key=f"start_{row['id']}",
                    )
                    end_sec = c2.number_input(
                        "終了秒",
                        min_value=0.0,
                        value=float(row.get("end_sec") or 0),
                        key=f"end_{row['id']}",
                    )
                    order_num = int(
                        c3.number_input(
                            "順番",
                            min_value=1,
                            value=int(row.get("order_num") or 1),
                            key=f"order_{row['id']}",
                        )
                    )
                    text_ja = st.text_area(
                        "日本語テキスト",
                        value=row.get("text_ja") or "",
                        key=f"text_ja_{row['id']}",
                    )
                    text_zh = st.text_area(
                        "中国語テキスト（任意）",
                        value=row.get("text_zh") or "",
                        key=f"text_zh_{row['id']}",
                    )
                    style = st.text_input(
                        "スタイル（任意：例 ボールド、黄色など）",
                        value=row.get("style") or "",
                        key=f"style_{row['id']}",
                    )
                    new_rows.append(
                        {
                            "id": row["id"],
                            "script_id": script_id,
                            "start_sec": start_sec,
                            "end_sec": end_sec,
                            "order_num": order_num,
                            "text_ja": text_ja,
                            "text_zh": text_zh,
                            "style": style,
                        }
                    )

            st.markdown("---")
            st.markdown("### 行を追加")
            add_count = st.number_input("追加する行数", min_value=0, max_value=20, value=0)
            for i in range(int(add_count)):
                with st.expander(f"新規 #{max_existing_order + i + 1}", expanded=False):
                    c1, c2, c3 = st.columns(3)
                    start_sec = c1.number_input(
                        "開始秒",
                        min_value=0.0,
                        value=0.0,
                        key=f"new_start_{i}",
                    )
                    end_sec = c2.number_input(
                        "終了秒",
                        min_value=0.0,
                        value=0.0,
                        key=f"new_end_{i}",
                    )
                    order_num = int(
                        c3.number_input(
                            "順番",
                            min_value=1,
                            value=max_existing_order + i + 1,
                            key=f"new_order_{i}",
                        )
                    )
                    text_ja = st.text_area(
                        "日本語テキスト",
                        value="",
                        key=f"new_text_ja_{i}",
                    )
                    text_zh = st.text_area(
                        "中国語テキスト（任意）",
                        value="",
                        key=f"new_text_zh_{i}",
                    )
                    style = st.text_input(
                        "スタイル（任意：例 ボールド、黄色など）",
                        value="",
                        key=f"new_style_{i}",
                    )
                    new_rows.append(
                        {
                            "id": None,
                            "script_id": script_id,
                            "start_sec": start_sec,
                            "end_sec": end_sec,
                            "order_num": order_num,
                            "text_ja": text_ja,
                            "text_zh": text_zh,
                            "style": style,
                        }
                    )

            submitted = st.form_submit_button("字幕を保存")

        if submitted:
            try:
                # 既存行を一旦削除してから再挿入（シンプルな同期方法）
                supabase.table("video_subtitles").delete().eq("script_id", script_id).execute()
                insert_rows = []
                for r in new_rows:
                    if r["text_ja"]:
                        insert_rows.append(
                            {
                                "script_id": script_id,
                                "start_sec": r["start_sec"],
                                "end_sec": r["end_sec"],
                                "order_num": r["order_num"],
                                "text_ja": r["text_ja"],
                                "text_zh": r["text_zh"],
                                "style": r["style"],
                            }
                        )
                if insert_rows:
                    res = supabase.table("video_subtitles").insert(insert_rows).execute()
                    if getattr(res, "error", None):
                        st.error(f"保存に失敗しました: {res.error}")
                    else:
                        st.success("字幕を保存しました。")
                        st.experimental_rerun()
                else:
                    st.info("保存対象の字幕がありませんでした。")
            except Exception as e:
                st.error(f"字幕保存中にエラーが発生しました: {e}")

    with col_export:
        st.subheader("SRTエクスポート")
        if subtitles:
            srt_text = generate_srt(sorted(subtitles, key=lambda x: x.get("order_num") or 0))
            st.text_area("プレビュー", srt_text, height=300)
            st.download_button(
                label="SRTファイルをダウンロード",
                data=srt_text,
                file_name=f"subtitles_script_{script_id}.srt",
                mime="text/plain",
            )
        else:
            st.info("字幕がまだ登録されていません。")


# -----------------------------
# ページ4: 進捗ダッシュボード
# -----------------------------
def page_dashboard() -> None:
    st.header("📊 進捗ダッシュボード")
    st.caption("動画制作の全体進捗とパフォーマンスを可視化するページです。")

    col_top, col_bottom = st.columns(1)
    with col_top:
        c1, c2, c3, c4 = st.columns(4)

        try:
            ideas_res = supabase.table("video_ideas").select("id, status").execute()
            scripts_res = supabase.table("video_scripts").select("id, status").execute()
            projects_res = supabase.table("video_projects").select("*").execute()
            if any(
                getattr(r, "error", None)
                for r in [ideas_res, scripts_res, projects_res]
            ):
                st.error("ダッシュボード用データの取得に失敗しました。")
                return
            ideas: List[dict] = ideas_res.data or []
            scripts: List[dict] = scripts_res.data or []
            projects: List[dict] = projects_res.data or []
        except Exception as e:
            st.error(f"ダッシュボードデータ取得中にエラーが発生しました: {e}")
            return

        total_ideas = len(ideas)
        total_scripts = len(scripts)
        total_projects = len(projects)
        published_projects = len([p for p in projects if p.get("status") == "公開済み"])

        c1.metric("登録ネタ数", total_ideas)
        c2.metric("台本数", total_scripts)
        c3.metric("動画プロジェクト数", total_projects)
        c4.metric("公開済み動画数", published_projects)

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("ネタのステータス分布")
        status_counts = {}
        for i in ideas:
            status_counts[i.get("status", "未設定")] = status_counts.get(
                i.get("status", "未設定"), 0
            ) + 1
        if status_counts:
            st.bar_chart(status_counts)
        else:
            st.info("ネタがまだ登録されていません。")

    with col2:
        st.subheader("動画プロジェクトのパフォーマンス")
        if projects:
            # シンプルなテーブル表示
            import pandas as pd

            df = pd.DataFrame(projects)
            # カラム名を一部日本語に変換（表示用）
            rename_map = {
                "title": "タイトル",
                "platform": "プラットフォーム",
                "status": "ステータス",
                "post_date": "投稿日",
                "views": "再生数",
                "inquiries": "問い合わせ数",
            }
            df_disp = df[list(rename_map.keys())].rename(columns=rename_map)
            st.dataframe(df_disp)
        else:
            st.info("動画プロジェクトがまだ登録されていません。")

    st.markdown("---")
    st.subheader("動画プロジェクトの登録 / 編集（簡易）")
    with st.form("project_form"):
        project_id = st.text_input("ID（既存を更新する場合のみ指定。新規は空のまま）")
        title = st.text_input("タイトル")
        platform = st.selectbox("プラットフォーム", ["YouTube", "TikTok", "その他"])
        status = st.selectbox("ステータス", ["企画中", "撮影中", "編集中", "公開済み"])
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
                    st.experimental_rerun()
            except Exception as e:
                st.error(f"動画プロジェクト保存中にエラーが発生しました: {e}")


# -----------------------------
# ページ5: AIネタ生成（枠のみ）
# -----------------------------
def page_ai_idea() -> None:
    st.header("🤖 AIネタ生成（準備中）")
    st.caption("Gemini API と連携してネタを自動生成するページです。現在はUIのみ仮実装です。")

    st.info("Gemini API連携は後日実装予定です。")

    col_left, col_right = st.columns([2, 3])
    with col_left:
        target = st.text_input("ターゲット（例：中小企業経営者）")
        genre = st.text_input("ジャンル（例：マーケティング、受験対策）")
        tone = st.selectbox(
            "トーン",
            ["真面目", "砕けた", "情熱的", "論理的"],
        )
        num_ideas = st.slider("生成するネタ数", 1, 20, 5)
        st.button("AIにネタを提案してもらう（ダミー）")

    with col_right:
        st.subheader("提案結果（ダミー）")
        st.write("ここにGemini APIからの提案結果が表示されます。")


# -----------------------------
# メイン
# -----------------------------
def main() -> None:
    init_session_state()

    with st.sidebar:
        st.title("未来塾 動画制作ラボ")
        page = st.radio(
            "ページを選択",
            [
                "💡 ネタバンク",
                "📝 台本ビルダー",
                "💬 字幕エディタ（SRT）",
                "📊 進捗ダッシュボード",
                "🤖 AIネタ生成",
            ],
            index=0,
            key="page",
        )
        st.markdown("---")
        st.caption("管理者用・社内専用ツール")

    if page == "💡 ネタバンク":
        page_idea_bank()
    elif page == "📝 台本ビルダー":
        page_script_builder()
    elif page == "💬 字幕エディタ（SRT）":
        page_subtitle_editor()
    elif page == "📊 進捗ダッシュボード":
        page_dashboard()
    elif page == "🤖 AIネタ生成":
        page_ai_idea()


if __name__ == "__main__":
    main()

