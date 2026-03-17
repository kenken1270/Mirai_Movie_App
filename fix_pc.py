import re

with open("app.py", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'def page_script_pc\(\) -> None:.*?(?=def page_script_mobile)'
new_func = '''def page_script_pc() -> None:
    st.header("📝 台本 & 字幕 自動生成")
    st.caption("左のアイデア一覧からアイデアを選んで台本を生成します。")

    col_left, col_right = st.columns([1, 2])

    with col_left:
        st.subheader("📋 アイデアを選ぶ")
        status_opts = ["すべて", "未使用", "使う予定", "制作中", "完了"]
        pc_filter = st.selectbox("ステータス絞り込み", status_opts, key="pc_script_status_filter")

        try:
            q = supabase.table("video_themes").select("*").neq("idea_status", "アーカイブ").order("created_at", desc=True).limit(30)
            if pc_filter != "すべて":
                q = q.eq("idea_status", pc_filter)
            res_themes = q.execute()
            themes = res_themes.data or []
        except Exception as e:
            st.error(f"アイデア取得エラー: {e}")
            themes = []

        if not themes:
            st.info("アイデアがありません。")
            st.caption("💡 アイデアページでアイデアを生成してください")
        else:
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
                is_selected = str(theme_id) == str(st.session_state.get("selected_theme_id", ""))

                with st.container():
                    st.caption(f"{category}  |  {status}")
                    title_display = f"✅ {title}" if is_selected else title
                    st.markdown(f"**{title_display}**")
                    if hook:
                        st.caption(hook[:40] + "..." if len(hook) > 40 else hook)
                    btn_label = "選択中" if is_selected else "このアイデアで作る ›"
                    btn_type = "primary" if is_selected else "secondary"
                    if st.button(btn_label, key=f"pc_select_{theme_id}", use_container_width=True, type=btn_type, disabled=is_selected):
                        st.session_state["selected_theme_id"] = str(theme_id)
                        st.session_state["selected_idea"] = title
                        st.session_state["generated_script"] = None
                        st.session_state["selected_script_id"] = None
                        st.session_state["project_created"] = False
                        st.rerun()
                    st.divider()

    with col_right:
        theme_id = st.session_state.get("selected_theme_id")
        if not theme_id:
            st.info("← 左のアイデア一覧からアイデアを選んでください")
            return

        try:
            res = supabase.table("video_themes").select("*").eq("id", theme_id).limit(1).execute()
            rows = res.data or []
            if not rows:
                st.error("選択されたテーマが見つかりません。")
                return
            theme_row = rows[0]
            selected_idea = json.loads(theme_row.get("selected_idea") or "{}")
        except Exception as e:
            st.error(f"テーマ取得エラー: {e}")
            return

        st.subheader("✍️ 台本 & 字幕 自動生成")
        st.markdown(f"""
**📌 選択中のアイデア**
🏷️ {theme_row.get("category") or "未分類"}
**{selected_idea.get("title", "")}**
> {selected_idea.get("hook", "")}
""")

        st.markdown("---")
        st.subheader("STEP 1: 台本自動生成")
        script_data = st.session_state.get("generated_script") or {}

        if st.button("🎬 台本を自動生成する", use_container_width=True):
            with st.spinner("Geminiで台本を生成中..."):
                script_data = generate_script(selected_idea)
            st.session_state.generated_script = script_data
            if not script_data:
                st.info("台本の自動生成に失敗しました。")

        if not script_data:
            st.info("「台本を自動生成する」ボタンを押してください。")
            return

        hook_text = st.text_area("フック（0〜5秒）", value=script_data.get("hook", ""), height=80)
        problem_text = st.text_area("問題提示（5〜15秒）", value=script_data.get("problem", ""), height=100)
        solution_text = st.text_area("解決策・本編（15〜45秒）", value=script_data.get("solution", ""), height=200)
        cta_text = st.text_area("CTA（45〜60秒）", value=script_data.get("cta", ""), height=80)

        default_full = script_data.get("full_script") or "\\n\\n".join([
            f"【フック】\\n{hook_text}",
            f"【問題提示】\\n{problem_text}",
            f"【解決策】\\n{solution_text}",
            f"【CTA】\\n{cta_text}",
        ])
        full_script = st.text_area("フル台本（編集可）", value=default_full, height=260)

        if st.button("💾 台本を保存する", use_container_width=True):
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
                st.error(f"台本保存エラー: {e}")

        st.markdown("---")
        st.subheader("STEP 2: 字幕自動生成")
        script_id = st.session_state.get("selected_script_id")
        if not script_id:
            st.info("字幕生成には、まず上で台本を保存してください。")
            return

        if st.button("🎞️ 字幕を自動生成する", use_container_width=True):
            video_length_sec = 60
            try:
                res_prof = supabase.table("studio_profile").select("video_length_sec").eq("id", 1).limit(1).execute()
                rows = res_prof.data or []
                if rows:
                    video_length_sec = int(rows[0].get("video_length_sec") or 60)
            except Exception:
                pass

            num_subtitles = max(3, int(video_length_sec / 5))
            st.info(f"動画 {video_length_sec}秒 → {num_subtitles}個の字幕を生成します。")
            clean_script = re.sub(r"【[^】]*】", "", full_script)
            clean_script = re.sub(r"\\n+", "\\n", clean_script).strip()

            try:
                api_key = st.secrets["gemini"]["api_key"]
            except Exception:
                st.warning("Gemini APIキーが設定されていません。")
                return

            with st.spinner("Geminiで字幕用テキストを生成中..."):
                subtitle_texts = generate_subtitle_texts(clean_script, num_subtitles, api_key)

            step_sec = video_length_sec / num_subtitles
            subtitles_rows = []
            for idx, text in enumerate(subtitle_texts):
                subtitles_rows.append({
                    "script_id": script_id,
                    "order_num": idx + 1,
                    "start_sec": int(step_sec * idx),
                    "end_sec": int(step_sec * (idx + 1)),
                    "text_ja": text,
                    "text_zh": "",
                    "style": "",
                })

            try:
                supabase.table("video_subtitles").delete().eq("script_id", script_id).execute()
                res = supabase.table("video_subtitles").insert(subtitles_rows).execute()
                if getattr(res, "error", None):
                    st.error(f"字幕保存に失敗しました: {res.error}")
                else:
                    st.success("字幕を自動生成して保存しました。")
            except Exception as e:
                st.error(f"字幕保存エラー: {e}")

        try:
            res_subs = supabase.table("video_subtitles").select("*").eq("script_id", script_id).order("order_num", desc=False).execute()
            subtitles = res_subs.data or []
        except Exception as e:
            st.error(f"字幕取得エラー: {e}")
            return

        if subtitles:
            st.markdown("#### 自動生成された字幕一覧")
            df = pd.DataFrame(subtitles)[["order_num", "start_sec", "end_sec", "text_ja"]]
            df = df.rename(columns={"order_num": "順番", "start_sec": "開始秒", "end_sec": "終了秒", "text_ja": "日本語テキスト"})
            st.dataframe(df, use_container_width=True)
            srt_text = generate_srt(subtitles)
            st.download_button(label="SRTファイルをダウンロード", data=srt_text, file_name=f"script_{script_id}_subtitles.srt", mime="text/plain")

        if script_id and not st.session_state.get("project_created", False):
            if st.button("🎬 プロジェクト化する", use_container_width=True):
                project_title = selected_idea.get("title") or "無題プロジェクト"
                payload = {"title": project_title, "platform": "未設定", "status": "撮影中", "post_date": None, "views": 0, "inquiries": 0, "memo": f"台本から自動作成（script_id={script_id}）", "notes": f"台本から自動作成（script_id={script_id}）"}
                try:
                    res = supabase.table("video_projects").insert(payload).execute()
                    if getattr(res, "error", None):
                        st.error(f"プロジェクト作成エラー: {res.error}")
                    else:
                        st.session_state.project_created = True
                        st.success("プロジェクトを作成しました！進捗ダッシュボードで管理できます。")
                except Exception as e:
                    st.error(f"プロジェクト作成エラー: {e}")
        elif script_id and st.session_state.get("project_created", False):
            st.info("✅ この台本からのプロジェクトは作成済みです。")
        else:
            st.info("字幕がまだ登録されていません。")

'''

result = re.sub(pattern, new_func, content, flags=re.DOTALL)

if "col_left, col_right = st.columns" in result:
    with open("app.py", "w", encoding="utf-8") as f:
        f.write(result)
    print("✅ 置換成功！app.pyを更新しました。")
else:
    print("❌ 置換失敗。app.pyは変更されていません。")
