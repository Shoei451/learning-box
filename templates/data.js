// ══════════════════════════════════════════════
// data.js — フラッシュカード設定 & データ
// ══════════════════════════════════════════════

// ─────────────────────────────────────────────
// [1] データソース切り替え  ← ここだけ変える
//     false → CARDS を使用（Supabase 不要）
//     true  → Supabase から取得
// ─────────────────────────────────────────────
const USE_SUPABASE = false;

// ─────────────────────────────────────────────
// [2] Supabase 接続設定（USE_SUPABASE = true のとき必要）
// ─────────────────────────────────────────────

const SUPABASE_URL       = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY       = 'YOUR_ANON_KEY';
const SUPABASE_TABLE_CAT = 'your_categories';  // key TEXT PK, label TEXT, sort INT
const SUPABASE_TABLE_Q   = 'your_questions';   // id, category, question, answer, explanation, image_url

// ─────────────────────────────────────────────
// [3] デッキのメタ情報
// ─────────────────────────────────────────────
const DECK_META = {
  title:   'フラッシュカード',   // スタート画面の大見出し・ヘッダー
  subject: 'SUBJECT',           // スタート画面の英語サブタイトル
};

// ─────────────────────────────────────────────
// [4] カテゴリカラーパレット（category 名 → 色）
//
//     USE_SUPABASE の true/false に関わらず、色の定義は
//     常にここで行う。カードのカテゴリキーとここのキーを
//     一致させれば自動で適用される。
//     ここにないカテゴリキーには default が使われる。
//
//     text : 表面バッジの文字色
//     bg   : 表面バッジの背景色
//     card : 裏面カードの背景色（メインカラー）
//
//     ── カラーリファレンス ────────────────────
//     使いたい色を有効化し、キーを category と一致させる。
//
//   【青系】
//     blue:    { text: '#1d4ed8', bg: '#eff6ff', card: '#1d4ed8' }
//     sky:     { text: '#0369a1', bg: '#f0f9ff', card: '#0369a1' }
//     cyan:    { text: '#0891b2', bg: '#ecfeff', card: '#0e7490' }
//
//   【緑系】
//     green:   { text: '#15803d', bg: '#f0fdf4', card: '#15803d' }
//     teal:    { text: '#0f766e', bg: '#f0fdfa', card: '#0f766e' }
//     olive:   { text: '#4d7c0f', bg: '#f7fee7', card: '#65a30d' }
//
//   【赤・橙系】
//     red:     { text: '#b91c1c', bg: '#fef2f2', card: '#dc2626' }
//     orange:  { text: '#c2410c', bg: '#fff7ed', card: '#ea580c' }
//     amber:   { text: '#b45309', bg: '#fffbeb', card: '#d97706' }
//     yellow:  { text: '#a16207', bg: '#fefce8', card: '#ca8a04' }
//
//   【紫系】
//     purple:  { text: '#6d28d9', bg: '#f5f3ff', card: '#6d28d9' }
//     violet:  { text: '#7c3aed', bg: '#f5f3ff', card: '#7c3aed' }
//     pink:    { text: '#be185d', bg: '#fdf2f8', card: '#db2777' }
//
//   【グレー・ニュートラル】
//     slate:   { text: '#334155', bg: '#f8fafc', card: '#475569' }
//     stone:   { text: '#44403c', bg: '#fafaf9', card: '#57534e' }
// ─────────────────────────────────────────────
const CATEGORY_STYLES = {
  default: { text: '#2d6a4f', bg: '#e8f5e9', card: '#2d6a4f' },

  // ── 使用するカテゴリの色をここに書く ──
  cat_a: { text: '#1d4ed8', bg: '#eff6ff', card: '#1d4ed8' },  // 青
  cat_b: { text: '#6d28d9', bg: '#f5f3ff', card: '#6d28d9' },  // 紫
  cat_c: { text: '#0891b2', bg: '#ecfeff', card: '#0e7490' },  // シアン
};

// ─────────────────────────────────────────────
// [5] フィルター定義（USE_SUPABASE = false のとき使用）
//
//     USE_SUPABASE = true のときは koten_categories テーブルから
//     自動生成されるため、ここの定義は無視される。
//
//     表示順・ラベル・絞り込みロジックをここで管理する。
//     行をコメントアウトするとそのボタンが非表示になる。
// ─────────────────────────────────────────────
const FILTER_DEFS = [
  { id: 'all',   label: 'すべて',     match: ()  => true },
  { id: 'cat_a', label: 'カテゴリA',  match: c => c.category === 'cat_a' },
  { id: 'cat_b', label: 'カテゴリB',  match: c => c.category === 'cat_b' },
  { id: 'cat_c', label: 'カテゴリC',  match: c => c.category === 'cat_c' },
];

// ─────────────────────────────────────────────
// [6] カードデータ（USE_SUPABASE = false のとき使用）
//     フィールド:
//       category  : CATEGORY_STYLES のキーと一致させる
//       q         : 問題文（\n で改行可）
//       a         : 答え
//       sub       : 補足説明（省略可）
//       image_url : 画像URL（省略可）
// ─────────────────────────────────────────────
const CARDS = [
  // ── カテゴリA ──
  { category: 'cat_a', q: 'サンプル問題 A-1\nここに問題文を書く。', a: 'サンプル答え A-1', sub: '解説があればここに書く。' },
  { category: 'cat_a', q: 'サンプル問題 A-2', a: 'サンプル答え A-2' },
  { category: 'cat_a', q: 'サンプル問題 A-3', a: 'サンプル答え A-3' },

  // ── カテゴリB ──
  { category: 'cat_b', q: 'サンプル問題 B-1', a: 'サンプル答え B-1', sub: '解説テキスト。' },
  { category: 'cat_b', q: 'サンプル問題 B-2', a: 'サンプル答え B-2' },
  { category: 'cat_b', q: 'サンプル問題 B-3', a: 'サンプル答え B-3' },

  // ── カテゴリC ──
  { category: 'cat_c', q: 'サンプル問題 C-1', a: 'サンプル答え C-1' },
  { category: 'cat_c', q: 'サンプル問題 C-2', a: 'サンプル答え C-2', sub: '解説テキスト。' },
];