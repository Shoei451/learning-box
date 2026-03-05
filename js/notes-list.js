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
    url:     'note.html?slug=home-3-exam',
    color:   '#2d6a4f',
    updated: '2026-03-03',
  },
   {
    id:      'home-2-exam',
    title:   '家庭基礎 2学期期末テスト対策',
    subject: '家庭基礎',
    tags:    ['期末対策', '5大栄養素', '炭水化物', '脂質', 'たんぱく質', '食中毒'],
    url:     'note.html?slug=home-2-exam',
    color:   '#0891b2',
    updated: '2026-03-03',
  },
  { 
    id:      'healthcare-3-exam',
    title:   '保健 3学期まとめノート',
    subject: '保健',
    tags:    ['期末対策', '環境と健康', '食品安全', '医薬品'],
    url:     'note.html?slug=healthcare-3-exam',
    color:   '#5b6abf',
    updated: '2026-03-04',
  },
  {
    id:      'geo-3-exam',
    title:   '地理総合 言語・宗教・日本の自然環境・防災',
    subject: '地理総合',
    tags:    ['期末対策', '3学期', '言語・宗教', '日本の自然環境', '防災'],
    url:     'note.html?slug=geo-3-exam',
    color:   '#d2dd32',
    updated: '2026-03-05',
  },
  {
    id:       'postwar-africa-history',
    title:    '世界史 アフリカ諸国の独立',
    subject:  '世界史探究',
    tags:     ['アフリカ', '独立', '植民地', '紛争', '南北問題'],
    url:      'note.html?slug=postwar-africa-history',
    color:    '#5bf016d5',
    updated:  '2026-03-05',
  },


  // ── テンプレート（コピーして使う）────────────
  // {
  //   id:      'unique-id',
  //   title:   'ノートタイトル',
  //   subject: '教科名',
  //   tags:    ['タグ1', 'タグ2'],
  //   url:     'notes/xxx/index.html',
  //   color:   '#7c3aed',
  //   updated: 'YYYY-MM-DD',
  // },
];
