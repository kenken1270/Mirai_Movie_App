import re

with open("app.py", "r", encoding="utf-8") as f:
    content = f.read()

old = '''def page_script_pc() -> None:
    st.header("📝 台本 & 字幕 自動生成")
    st.caption("選択したアイデアから台本と字幕を自動生成します。")

    theme_id = st.session_state.get("selected_theme_id")
    if not theme_id:
        st.info("まず「💡 テーマ & アイデア生成」でアイデアを選択してください。")
        return'''

if old in content:
    print("✅ 対象関数を発見しました")
else:
    print("❌ 対象関数が見つかりません")
    print("--- 現在のpage_script_pc冒頭 ---")
    idx = content.find("def page_script_pc")
    print(content[idx:idx+200])
