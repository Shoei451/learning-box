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
    url:     'flashcard.html?slug=home-3-exam',
    color:   '#2d6a4f',
    updated: '2026-03-02',
  },
  {
    id:      'home-2-exam',
    title:   '家庭基礎 食事と栄養・食品衛生',
    subject: '家庭基礎',
    tags:    ['期末対策', '栄養', '5大栄養素', '食中毒'],
    url:     'flashcard.html?slug=home-2-exam',
    color:   '#0891b2',
    updated: '2026-03-03',
  },
  {
    id:      'geo-3-exam',
    title:   '地理総合 宗教文化・日本の気候・防災',
    subject: '地理総合',
    tags:    ['期末対策', '地理', '宗教', '気候', '防災'],
    url:     'flashcard.html?slug=geo-3-exam',
    color:   '#d2dd32',
    updated: '2026-03-04',
  },
  { 
    id:      'seikei-3-exam',
    title:   '政治経済 3学期期末テスト対策',
    subject: '政治経済',
    tags:    ['期末対策', '日本経済史', '中小企業問題', '農業問題', '消費者問題', '経済諸問題', '財政', '労働問題', '社会保障'],
    url:     'flashcard.html?slug=seikei-3-exam',
    color:   '#ec9f2a',
    updated: '2026-03-05',
  },

  // ── テンプレート（コピーして使う）────────────
  // {
  //   id:      'unique-id',          // 半角英数・ハイフンのみ
  //   title:   'カードセット名',
  //   subject: '教科名',
  //   tags:    ['タグ1', 'タグ2'],   // 任意、空配列でもOK
  //   url:     'flashcards/xxx/index.html',
  //   color:   '#2563eb',            // アクセントカラー（HEX）
  //   updated: 'YYYY-MM-DD',
  // },
];
