# add_tavily.py
tavily_key = "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"  # ← ここを実際のキーに変更

# secrets.tomlに追加
with open('.streamlit/secrets.toml', 'a', encoding='utf-8') as f:
    f.write(f'\n[tavily]\napi_key = "{tavily_key}"\n')
print('secrets.toml に追加完了！')

# requirements.txtに追加
with open('requirements.txt', 'a', encoding='utf-8') as f:
    f.write('tavily-python\n')
print('requirements.txt に追加完了！')
