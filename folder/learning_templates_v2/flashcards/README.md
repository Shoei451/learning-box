# learning_templates v2 — README

---

## flashcards-v2/

フラッシュカードアプリ。Supabase 連携の有無を **1行で** 切り替えられる。

### ファイル構成

```
flashcards-v2/
├── index.html   # HTML（変更不要）
├── style.css    # スタイル（変更不要）
├── data.js      # ★設定 & カードデータ（ここを編集）
└── app.js       # ロジック（変更不要）
```

### 使い方

**A) Supabase なし（静的データ）**

`data.js` の `CARDS` 配列に問題を追加するだけ。

```js
const USE_SUPABASE = false;   // ← この行だけ

const CARDS = [
  { category: 'vocab', q: '問題文', a: '答え', sub: '補足（省略可）' },
  // ...
];
```

**B) Supabase あり**

```js
const USE_SUPABASE = true;    // ← true に変更
const SUPABASE_URL      = 'https://xxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

`true` にするとヘッダーに「編集」タブが現れ、問題の追加・編集・削除・CSV import/export ができる。

**必要なテーブル:**
```sql
CREATE TABLE flashcards (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  explanation TEXT,
  image_url   TEXT
);
```

### カテゴリカラーのカスタマイズ

`data.js` の `CATEGORY_STYLES` に category 名をキーとして追加する。

```js
const CATEGORY_STYLES = {
  default: { text: '#2d6a4f', bg: '#e8f5e9', card: '#2d6a4f' },
  vocab:   { text: '#2563eb', bg: '#eff6ff', card: '#1d4ed8' },
};
```

---

## summary-notes-v2/

まとめノート + 穴埋めクイズ。Quiz パネルは `blank_notes` スタイル（幅自動追従）に刷新済み。

### ファイル構成

```
summary-notes-v2/
├── index.html      # HTML（変更不要）
├── style.css       # スタイル（変更不要）
├── app.js          # ★UNITS 定義 & ロジック（UNITS 配列を編集）
└── units/
    ├── 01.md       # Unit 01 のまとめ（Markdown）
    ├── 02.md       # Unit 02 のまとめ
    └── ...
```

### 使い方

**1. `app.js` の `UNITS` 配列を編集**

```js
const UNITS = [
  {
    id:    'u01',
    num:   '01',
    title: 'ユニットタイトル',
    file:  'units/01.md',     // Markdown ファイルのパス
    color: '#2d6a4f',         // アクセントカラー
    quiz: [
      {
        q:      '___は生命の基本単位である。___をもつ細胞を___という。',
        blanks: ['細胞', '核', '真核細胞'],
        hints:  [null, null, 'ヒント文字列（省略可）'],
      },
    ],
  },
];
```

- `q` の `___`（半角スペース+アンダースコア3つ+半角スペース）が入力欄になる
- `blanks` は左から順に正解を並べる
- `hints` は各 blank に対応するヒント（`null` で非表示）

**2. `units/01.md` などに Markdown でまとめを書く**

まとめタブに表示される。クイズとは独立しているので自由に書ける。

### Quiz の変更点（blank_notes スタイル）

旧版との違い:
- 入力欄の幅が `fitBlank()` で答えの長さに自動追従（不必要に長くならない）
- `:focus` 時に薄いハイライト
- 正誤判定で色変化 + シェイクアニメーション
- ヒントアイコンをホバーで表示
- 「答えを表示」ボタンを追加
