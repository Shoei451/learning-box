// ── カードデータ ─────────────────────────────────
// FILTERS: 各エントリの match(card) でどのカードを含むか決める
// 最初の要素が「すべて」に相当する
const FILTERS = [
  { id: 'all',      label: 'すべて',      match: () => true },
  // ↓ カテゴリ追加例
  // { id: 'canada',   label: 'カナダ',      match: c => c.cat === 'canada' },
  // { id: 'religion', label: '宗教・食生活', match: c => c.cat === 'religion' },
];

// CATEGORY_STYLES: cat ごとの色定義
const CATEGORY_STYLES = {
  // cat: { text, bg, card }
  // 例:
  // canada:    { text: '#3b82f6', bg: '#eff6ff', card: '#3b82f6' },
  // religion:  { text: '#8b5cf6', bg: '#f5f3ff', card: '#7c3aed' },
  default:     { text: '#2d6a4f', bg: '#e8f5e9', card: '#2d6a4f' },
};

// CARDS: 問題データ配列
// { cat, label, q, a, sub }
// sub は裏面の補足（省略可）
const CARDS = [
  // ── サンプル（実際の問題に差し替えてください） ──
  { cat: 'sample', label: 'サンプル',
    q: 'サンプル問題 1\nここに問題文を記述します。',
    a: 'サンプル答え 1',
    sub: '補足説明があればここに書く。\n複数行もOK。' },
  { cat: 'sample', label: 'サンプル',
    q: 'サンプル問題 2',
    a: 'サンプル答え 2',
    sub: '' },
];
