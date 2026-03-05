# 451 learning box

高校生向け自作学習ツール集。フラッシュカードとまとめノート（穴埋め付き）をブラウザ上で管理・学習するための静的サイト。Netlify にデプロイ済み。

## 概要

フレームワーク不使用のバニラ HTML/CSS/JS で構築。外部依存は [marked.js](https://marked.js.org/) のみ。コンテンツ（カードデータ・ノートのMarkdown）を追加するだけで機能が拡張できる設計になっている。

## 機能

### フラッシュカード (`flashcard.html`)

- スタート画面でカテゴリ・問題数を選択してから学習開始
- カードを裏返して「わかった / あやふや / わからない」の3段階で自己採点
- 一周完了後に結果サマリーと教科別ブレークダウンを表示
- 「✗ △ のみ復習」で苦手カードだけ再出題
- キーボードショートカット対応（`←` `→` 移動、`Space` で裏返す、`1`/`2`/`3` で採点）
- 右サイドパネルにカード一覧と進捗ドットを表示

### まとめノート (`note.html`)

- Markdown ファイルをフェッチしてレンダリングする「まとめ」タブ
- `⟦⟦語句⟧⟧` 記法を使った穴埋めクイズ（トグル方式）タブ
- 左サイドバーでユニット間を移動（デスクトップ）／スライドメニュー（モバイル）
- キーボードショートカット対応（`←`/`h` `→`/`l` 移動、`s` まとめ、`q` 穴埋め）

## ファイル構成

```
.
├── index.html              # ホーム画面（カードセット・ノート一覧）
├── flashcard.html          # フラッシュカード学習画面
├── note.html               # まとめノート学習画面
│
├── js/
│   ├── flashcards-list.js  # フラッシュカードセット一覧データ
│   ├── notes-list.js       # まとめノート一覧データ
│   ├── flashcard-app.js    # フラッシュカードロジック
│   └── note-app.js         # まとめノートロジック
│
├── css/
│   ├── index-style.css
│   ├── flashcard-style.css
│   └── note-style.css
│
└── notes/
    └── <slug>/
        ├── meta.js         # NOTE_META と UNITS_DATA を定義
        └── 01.md, 02.md …  # ユニットごとの Markdown
```

フラッシュカードのカードデータは `notes/<slug>/` 以下に別途 JS ファイルとして配置する（slug ローダーが動的に読み込む）。

## コンテンツの追加方法

### フラッシュカードを追加する

1. `js/flashcards-list.js` に新しいエントリを追記する

```js
{
  id:      'unique-slug',
  title:   'カードセット名',
  subject: '教科名',
  tags:    ['タグ1', 'タグ2'],
  url:     'flashcard.html?slug=unique-slug',
  color:   '#2563eb',
  updated: 'YYYY-MM-DD',
},
```

2. `notes/unique-slug/` ディレクトリを作成してカードデータ JS を配置する

### まとめノートを追加する

1. `js/notes-list.js` に新しいエントリを追記する（同上の形式）

2. `notes/<slug>/meta.js` に `NOTE_META` と `UNITS_DATA` を定義する

```js
const NOTE_META = { title: 'ノートタイトル', subject: '教科名' };

const UNITS_DATA = [
  { id: 'u01', num: '01', title: 'ユニット名', file: 'notes/<slug>/01.md', color: '#2d6a4f' },
  // ...
];
```

3. `notes/<slug>/01.md` などに Markdown を書く。穴埋めにしたい語句は `⟦⟦語句⟧⟧` で囲む

## 穴埋め記法

`⟦⟦…⟧⟧` を使う。Markdown・Obsidian 構文と衝突せず、HTMLとして解釈されない。

```md
フランス革命が起きたのは ⟦⟦1789年⟧⟧ のことである。
```

まとめタブでは語句がハイライト表示され、穴埋めタブではクリックするまで非表示になる。

穴埋め生成用のツールは別のレポジトリにある
[cloze-builder](https://451-docs.netlify.app/toolbox/cloze-builder)

## 現在のコンテンツ

| 教科 | セット名 |
|------|----------|
| 家庭基礎 | 社会保障制度 + 民法 |
| 家庭基礎 | 食事と栄養・食品衛生 |
| 地理総合 | 宗教文化・日本の気候・防災 |
| 政治経済 | 3学期期末テスト対策 |
| 世界史探究 | アフリカ諸国の独立 |
| 保健 | 3学期まとめノート |

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不使用）
- [marked.js 9.1.6](https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js) — Markdown レンダリング
- Google Fonts（Noto Sans JP, Zen Kaku Gothic New, JetBrains Mono）
- Netlify（静的ホスティング）