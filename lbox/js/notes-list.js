// ══════════════════════════════════════════════
// notes-list.js
// まとめノートの一覧データ
//
// 新しいノートを追加する場合は
// このファイルに1エントリ追記するだけでOK
// ══════════════════════════════════════════════

const NOTES = [
  {
    id:      'home-3-exam',
    title:   '家庭基礎 3学期期末テスト対策',
    subject: '家庭基礎',
    tags:    ['期末対策', '子ども', '民法', '社会保障'],
    units:   12,
    url:     'note.html?slug=home-3-exam',
    color:   '#2d6a4f',
    updated: '2026-03-03',
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
