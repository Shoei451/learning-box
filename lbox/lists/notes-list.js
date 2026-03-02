// ══════════════════════════════════════════════
// notes-list.js
// まとめノートの一覧データ
//
// 新しいノートを追加する場合は
// このファイルに1エントリ追記するだけでOK
// ══════════════════════════════════════════════

const NOTES = [
  {
    id:      'katei-notes',
    title:   '家庭基礎まとめ',
    subject: '家庭基礎',
    tags:    ['期末対策'],
    units:   2,           // Unitの数（任意、0なら非表示）
    url:     'note.html?slug=katei',
    color:   '#2d6a4f',
    updated: '2026-03-02',
  },

  // ── テンプレート（コピーして使う）────────────
  // {
  //   id:      'unique-id',
  //   title:   'ノートタイトル',
  //   subject: '教科名',
  //   tags:    ['タグ1', 'タグ2'],
  //   units:   0,            // Unit数（任意、0なら非表示）
  //   url:     'notes/xxx/index.html',
  //   color:   '#7c3aed',
  //   updated: 'YYYY-MM-DD',
  // },
];
