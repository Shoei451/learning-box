# Markdown Cloze Builder

Markdown Cloze Builder は、**Markdown で自然に文章を編集しつつ、特定部分を「穴埋め（隠すタイプ）」として扱える教材を生成するためのワークフロー**です。

Obsidian などの Markdown エディタで快適に編集しながら、デプロイ時には HTML として安全に穴埋め UI を生成できます。

---

## 目的

- Markdown を **純粋な文章として編集**したい
- Obsidian の構文と **衝突しない**穴埋め指定方法が必要
- 穴埋め指定は **プレビューで選択するだけ**で行いたい
- デプロイ時に **安全に HTML 化**できる記号形式が必要
- md直読み・Node.js ビルドのどちらにも対応したい

---

## ワークフロー概要

1. **Obsidian で Markdown を編集**
   - 穴埋め部分は何も気にせず文章を書く

2. **専用 HTML ツールに Markdown を読み込む**
   - marked.js などでプレビュー表示

3. **穴埋めにしたい部分を選択して「穴埋め化」ボタンを押す**
   - 選択範囲が安全な記号で囲まれる
   - Markdown に書き戻される

4. **記号入り Markdown を保存**
   - これが教材用のソース

5. **デプロイ時に記号を HTML に変換**
   - md直読みならブラウザ JS
   - Node.js ビルドなら remark プラグインなど

---

## 採用する穴埋め記号：⟦⟦…⟧⟧

### 特徴

- Markdown と衝突しない
- Obsidian の構文とも衝突しない
- HTML として解釈されない
- 文章中に自然に出てこない（誤検出しない）
- 正規表現で安全にパースできる

### 記述例

```
これは ⟦⟦重要な語句⟧⟧ を隠す問題です。
```

---

## HTML ツールの構成

### 必要な UI

- Markdown 入力欄（textarea）
- プレビュー表示（HTML）
- 「穴埋め化」ボタン
- Markdown 出力欄（textarea or ダウンロード）

---

## コード例

### Markdown → HTML プレビュー

```html
<textarea id="md-input"></textarea>
<div id="preview"></div>

<script>
  const input = document.getElementById("md-input");
  const preview = document.getElementById("preview");

  input.addEventListener("input", () => {
    preview.innerHTML = marked.parse(input.value);
  });
</script>
```

---

### 選択範囲を ⟦⟦…⟧⟧ で囲む処理

```js
function wrapSelection() {
  const textarea = document.getElementById("md-input");
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start === end) return; // 選択なし

  const before = textarea.value.slice(0, start);
  const selected = textarea.value.slice(start, end);
  const after = textarea.value.slice(end);

  const wrapped = `⟦⟦${selected}⟧⟧`;

  textarea.value = before + wrapped + after;
  textarea.dispatchEvent(new Event("input"));
}
```

---

### デプロイ時の HTML 変換（ブラウザ側）

```js
function convertBlanks(html) {
  return html.replace(/⟦⟦([\s\S]*?)⟧⟧/g, (match, text) => {
    return `<span class="blank">${text}</span>`;
  });
}
```

---

### CSS（隠すタイプの穴埋め）

```css
.blank {
  background: #333;
  color: transparent;
  border-radius: 3px;
  padding: 0 4px;
  cursor: pointer;
  transition: 0.2s;
}

.blank:hover {
  color: #fff;
}
```

---

## デプロイ方式

### md直読み方式

- fetch で md を読み込み
- marked.js で HTML 化
- ⟦⟦…⟧⟧ を `<span class="blank">…</span>` に変換
- CSS/JS で穴埋め UI を実現

### Node.js ビルド方式

- remark プラグインで ⟦⟦…⟧⟧ を HTML に変換
- 静的 HTML としてデプロイ

---

## まとめ

- Markdown は純粋に書く
- 穴埋め指定はプレビューで選択するだけ
- 記号は ⟦⟦…⟧⟧ を採用（安全性最強）
- デプロイ時に HTML に変換して隠す UI を実現
- md直読み・Node.js ビルドの両方に対応

Markdown 編集体験と教材生成の自動化を両立するための、シンプルで堅牢な仕組みです。

---

## 追記 css案

カラー等はlearning-box側のデザインに応じて変更の余地あり

```css
/* ===== Cloze Word (IMPROVED!) ===== */
.cloze-word {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-size: 1em;
  user-select: none;
  font-weight: 600;
}

.cloze-word.cloze-hidden {
  background-color: var(--base02);
  color: var(--base02); /* Same as background - text invisible but present */
  text-shadow: none;
  border: 2px solid var(--base01);
  position: relative;
}

/* Show text length via invisible content */
.cloze-word.cloze-hidden::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: var(--base0);
  opacity: 0.3;
}

.cloze-word.revealed {
  background-color: var(--yellow);
  color: var(--base3);
  border: 2px solid var(--yellow);
}

.cloze-word:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.cloze-word:active {
  transform: scale(0.98);
}
```
