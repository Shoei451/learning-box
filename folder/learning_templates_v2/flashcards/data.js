// ══════════════════════════════════════════════
// data.js — 設定 & カードデータ
// ══════════════════════════════════════════════

// ─────────────────────────────────────────────
// [1] データソース切り替え  ← ここだけ変える
//     false → CARDS 配列を使用（Supabase 不要）
//     true  → Supabase から取得（以下の接続設定が必要）
// ─────────────────────────────────────────────
const USE_SUPABASE = true;

// ─────────────────────────────────────────────
// [2] Supabase 接続設定（USE_SUPABASE = true のとき必要）
//     必要なテーブル定義:
//       CREATE TABLE flashcards (
//         id          SERIAL PRIMARY KEY,
//         category    TEXT NOT NULL,
//         question    TEXT NOT NULL,
//         answer      TEXT NOT NULL,
//         explanation TEXT,
//         image_url   TEXT
//       );
// ─────────────────────────────────────────────
const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const SUPABASE_TABLE    = 'flashcards';

// ─────────────────────────────────────────────
// [3] カテゴリカラーパレット（category 名 → 色）
//     ここにない category は default が使われる
// ─────────────────────────────────────────────
const CATEGORY_STYLES = {
  default: { text: '#2d6a4f', bg: '#e8f5e9', card: '#2d6a4f' },
  // 例:
  // vocab:    { text: '#2563eb', bg: '#eff6ff', card: '#1d4ed8' },
  // grammar:  { text: '#7c3aed', bg: '#f5f3ff', card: '#6d28d9' },
};

// ─────────────────────────────────────────────
// [4] 静的カードデータ（USE_SUPABASE = false のとき使用）
//     フィールド:
//       category  : カテゴリ名（文字列）
//       q         : 問題文
//       a         : 答え
//       sub       : 補足説明（省略可）
//       image_url : 画像URL（省略可）
// ─────────────────────────────────────────────
const CARDS = [
  { category: 'sample', q: 'サンプル問題 1\nここに問題文を書く。', a: 'サンプル答え 1', sub: '補足説明があればここに。' },
  { category: 'sample', q: 'サンプル問題 2', a: 'サンプル答え 2', sub: '' },
];
