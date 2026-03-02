
## 構成

```
/
├── index.html              ← ホーム
├── flashcards-list.js      ← メタ一覧（URLはslug形式）
├── notes-list.js
│
├── flashcard.html          ← フラッシュカードUI（共通）
├── flashcard-app.js        ← ロジック（共通）
├── flashcard-style.css     ← スタイル（共通）
├── flashcards/
│   └── katei.js            ← DECK_META + CATEGORY_STYLES + FILTER_DEFS + CARDS
│
├── note.html               ← ノートUI（共通）
├── note-app.js             ← ロジック（共通）
├── note-style.css          ← スタイル（共通）
└── notes/
    └── katei/
        ├── meta.js         ← NOTE_META + UNITS_DATA
        ├── 01.md
        └── 02.md
```