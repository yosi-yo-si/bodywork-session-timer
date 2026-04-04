# bodywork-session-timer

iPad向けの施術フロー管理タイマー（HTML/CSS/JavaScriptのみで構成）。

## GitHub Pages 公開要件
このリポジトリは `main` ブランチのルートに以下ファイルを配置する構成です。

- `index.html`
- `style.css`
- `script.js`

GitHub Pages の設定:
1. **Settings > Pages** を開く
2. **Build and deployment** の **Source** を `Deploy from a branch` に設定
3. **Branch** を `main` / `/ (root)` に設定して保存

これで Pages のトップに `index.html` が表示されます。

## 競合解決メモ
PRで「This branch has conflicts」が出る場合は、`main` を取り込み後に
`index.html` / `style.css` / `script.js` がルートに残っていることを確認してください。

## 最短チェックコマンド
次のコマンドで、Pages配信に必要な最低条件（ルート3ファイル、競合マーカーなし、JS構文OK）を一括確認できます。

```bash
./scripts/verify-pages-root.sh
```
