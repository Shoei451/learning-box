# note.html 側の変更パッチ

⟦⟦…⟧⟧ トグル方式への移行。変更は3ファイル・最小限。

---

## 1. `js/note-app.js`

### 差し替え対象：`updateUnitMeta` 関数

**削除（旧）**

```js
function updateUnitMeta(unit) {
  const el = document.getElementById("unitProgress");
  const total = (unit.quiz || []).reduce((s, q) => s + q.blanks.length, 0);
  el.textContent = total > 0 ? `穴埋め ${total}問` : "";
}
```

**追加（新）**

```js
function updateUnitMeta(unit) {
  const el = document.getElementById("unitProgress");
  const md = mdCache[unit.file] || "";
  const cnt = (md.match(/⟦⟦[\s\S]*?⟧⟧/g) || []).length;
  el.textContent = cnt > 0 ? `穴埋め ${cnt}語` : "";
}
```

---

### 差し替え対象：`renderQuiz` 以降の関数群

**削除する関数（すべて）**

- `renderQuiz(unit)`
- `fitBlank(el)`
- `focusNextBlank(current)`
- `updateQuizProgress()`
- `checkQuiz()`
- `revealQuiz()`
- `retryWrong()`
- `resetQuiz()`
- `normalizeAns(s)`

**追加（新）**

```js
// ══════════════════════════════════════════════
// QUIZ（トグル方式）
// ══════════════════════════════════════════════
async function renderQuiz(unit) {
  document.getElementById("panelQuiz").style.display = "block";
  document.getElementById("panelSummary").style.display = "none";
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("errorState").style.display = "none";

  const wrap = document.getElementById("quizWrap");

  // MD をキャッシュから取得（なければfetch）
  let md = mdCache[unit.file];
  if (!md) {
    try {
      const res = await fetch(unit.file);
      if (!res.ok) throw new Error(`${res.status}`);
      md = await res.text();
      mdCache[unit.file] = md;
    } catch (e) {
      wrap.innerHTML = `<p class="quiz-empty">MDの読み込みに失敗しました: ${e.message}</p>`;
      return;
    }
  }

  // ⟦⟦…⟧⟧ をプレースホルダに置換してからmarked → スパンに戻す
  const ph = [];
  const escaped = md.replace(/⟦⟦([\s\S]*?)⟧⟧/g, (_, t) => {
    ph.push(t);
    return `CLZPH_${ph.length - 1}_END`;
  });

  if (!ph.length) {
    wrap.innerHTML = `<p class="quiz-empty">このUnitには穴埋め（⟦⟦…⟧⟧）がありません。</p>`;
    updateClozeCount();
    return;
  }

  let html = marked.parse(escaped);
  html = html.replace(/CLZPH_(\d+)_END/g, (_, i) => {
    const text = escHtml(ph[+i]);
    return `<span class="cloze-word cloze-hidden" onclick="toggleCloze(this)" data-answer="${text}">${text}</span>`;
  });

  wrap.innerHTML = html;
  updateClozeCount();
}

function toggleCloze(el) {
  el.classList.toggle("cloze-hidden");
  el.classList.toggle("revealed");
  updateClozeCount();
}

function revealAll() {
  document.querySelectorAll("#quizWrap .cloze-word").forEach((el) => {
    el.classList.remove("cloze-hidden");
    el.classList.add("revealed");
  });
  updateClozeCount();
}

function hideAll() {
  document.querySelectorAll("#quizWrap .cloze-word").forEach((el) => {
    el.classList.add("cloze-hidden");
    el.classList.remove("revealed");
  });
  updateClozeCount();
}

function resetQuiz() {
  hideAll();
  showToast("リセットしました");
}

function updateClozeCount() {
  const all = document.querySelectorAll("#quizWrap .cloze-word");
  const revealed = document.querySelectorAll("#quizWrap .cloze-word.revealed");
  const total = all.length;
  const done = revealed.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("quizProgressFill").style.width = pct + "%";
  document.getElementById("quizScoreBig").textContent = `${done} / ${total}`;

  // nav dot: 全部表示したら完了扱い
  const unit = UNITS[currentUnitIdx];
  const dot = document.getElementById(`navdot-${unit.id}`);
  if (dot) dot.classList.toggle("done", total > 0 && done === total);
}
```

---

## 2. `note.html`

### 差し替え対象：`#panelQuiz` 内の `.quiz-controls` と `.quiz-kb-hint`

**削除（旧）**

```html
<div class="quiz-controls">
  <button class="btn-primary" onclick="checkQuiz()">✓ 採点する</button>
  <button class="btn-ghost" onclick="revealQuiz()">答えを表示</button>
  <button class="btn-ghost" onclick="retryWrong()">✗ のみ再挑戦</button>
  <button class="btn-ghost" onclick="resetQuiz()">リセット</button>
  <span class="quiz-score" id="quizScore"></span>
</div>
<p class="quiz-kb-hint">
  ← Enter で次の空欄へ &nbsp;|&nbsp; ヒントアイコンにホバーでヒント →
</p>
```

**追加（新）**

```html
<div class="quiz-controls">
  <button class="btn-primary" onclick="revealAll()">全て表示</button>
  <button class="btn-ghost" onclick="hideAll()">全て隠す</button>
  <button class="btn-ghost" onclick="resetQuiz()">リセット</button>
</div>
<p class="quiz-kb-hint">語句をクリックして表示 / 再クリックで隠す</p>
```

### 差し替え対象：`#quizScoreBig` の初期値

**旧**

```html
<strong id="quizScoreBig">—</strong> <span>正解率</span>
```

**新**

```html
<strong id="quizScoreBig">— / —</strong> <span>表示済み</span>
```

---

## 3. `css/note-style.css`

### 削除するブロック

`.blank`, `.blank:focus`, `.blank.correct`, `.blank.incorrect`, `.blank-wrapper`,
`.hint-icon`, `@keyframes shake`, `.q-feedback`, `.fb-ok`, `.fb-ng`

（`.quiz-kb-hint` はテキスト変わるだけなのでCSSはそのままでOK）

### 追加するブロック

```css
/* ══════════════════════════════════════
   CLOZE WORD（トグル方式）
══════════════════════════════════════ */
.cloze-word {
  display: inline-block;
  padding: 1px 7px;
  margin: 0 1px;
  border-radius: 5px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  font-weight: 600;
  user-select: none;
  vertical-align: baseline;
}

.cloze-word.cloze-hidden {
  background: var(--color-text-primary, #1a1a1a);
  color: transparent;
  border: 1.5px solid rgba(0, 0, 0, 0.3);
}

.cloze-word.cloze-hidden:hover {
  background: #2d2d2d;
}

.cloze-word.revealed {
  background: var(--unit-color-light, var(--color-accent-light));
  color: var(--color-text-primary);
  border: 1.5px solid var(--unit-color, var(--color-accent));
}

.cloze-word:active {
  transform: scale(0.97);
}
```

---

## 変更サマリ

| ファイル         | 変更内容                                                | 規模                  |
| ---------------- | ------------------------------------------------------- | --------------------- |
| `note-app.js`    | `updateUnitMeta` 修正 + quiz関数群を丸替え              | ~80行削除 / ~60行追加 |
| `note.html`      | `quiz-controls` のボタン差し替え + スコア表示ラベル変更 | 5行                   |
| `note-style.css` | `.blank`系削除 / `.cloze-word`系追加                    | ~30行削除 / ~25行追加 |

`loadSummary`・`buildNav`・`navigateTo`・`switchTab` は**変更なし**。
`meta.js` の `quiz[]` は削除するだけ（`unit.file` はそのまま流用）。
