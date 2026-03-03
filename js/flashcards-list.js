// ══════════════════════════════════════════════
// flashcards-list.js
// フラッシュカードの一覧データ
//
// 新しいカードセットを追加する場合は
// このファイルに1エントリ追記するだけでOK
// ══════════════════════════════════════════════

const FLASHCARDS = [
  {
    id:      'home-3-exam',
    title:   '家庭基礎 社会保障制度 + 民法',
    subject: '家庭基礎',
    tags:    ['期末対策', '社会保障', '民法'],
    count:   64,
    url:     'flashcard.html?slug=home-3-exam',
    color:   '#2d6a4f',
    updated: '2026-03-02',
  },
    {
    id:      'home-2-exam',
    title:   '家庭基礎 食事と栄養・食品衛生',
    subject: '家庭基礎',
    tags:    ['期末対策', '栄養', '5大栄養素', '食中毒'],
    count:   70,
    url:     'flashcard.html?slug=home-2-exam',
    color:   '#0891b2',
    updated: '2026-03-03',
  },

  // ── テンプレート（コピーして使う）────────────
  // {
  //   id:      'unique-id',          // 半角英数・ハイフンのみ
  //   title:   'カードセット名',
  //   subject: '教科名',
  //   tags:    ['タグ1', 'タグ2'],   // 任意、空配列でもOK
  //   count:   0,                    // カード枚数（任意、0なら非表示）
  //   url:     'flashcards/xxx/index.html',
  //   color:   '#2563eb',            // アクセントカラー（HEX）
  //   updated: 'YYYY-MM-DD',
  // },
];
