// ═══════════════════════════════════════════════
// app.js — フラッシュカード
// data.js の USE_SUPABASE で動作が分岐する
// ═══════════════════════════════════════════════

// ── State ──
let allCards        = [];
let deck            = [];
let deckIdx         = 0;
let isFlipped       = false;
let isTransitioning = false;
let mastery         = {};
let listOpen        = false;

let selectedFilterId = 'all';
let selectedCount    = '20';

const SWAP_OUT_MS = 140;
const SWAP_IN_MS  = 180;

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
(async function init() {
  // タイトル反映
  applyMeta();

  // USE_SUPABASE = false のときはエディタタブを非表示
  const editorTab = document.getElementById('htab-editor');
  if (editorTab) editorTab.style.display = USE_SUPABASE ? '' : 'none';

  await loadAll();
  buildFilters();
  updateStartMeta();
  openStartScreen();
})();

// ── DECK_META を DOM に反映 ──
function applyMeta() {
  const m = typeof DECK_META !== 'undefined' ? DECK_META : {};
  if (m.title) {
    document.title = m.title;
    const titleEl = document.getElementById('headerTitle');
    if (titleEl) titleEl.textContent = m.title;
    const mainEl = document.getElementById('titleMain');
    if (mainEl) mainEl.textContent = m.title;
  }
  if (m.subject) {
    const subEl = document.getElementById('titleSub');
    if (subEl) subEl.textContent = m.subject;
  }
}

// ══════════════════════════════════════════════
// データ読み込み
// ══════════════════════════════════════════════
async function loadAll() {
  setStatus('読み込み中…', '');
  try {
    if (USE_SUPABASE) {
      await loadFromSupabase();
    } else {
      loadFromLocal();
    }
  } catch (e) {
    setStatus('エラー: ' + e.message, 'err');
    showToast('読み込みエラー: ' + e.message);
  }
}

async function loadFromSupabase() {
  const [cats, qs] = await Promise.all([
    sbFetch(`/rest/v1/${SUPABASE_TABLE_CAT}?select=key,label,sort&order=sort`),
    sbFetch(`/rest/v1/${SUPABASE_TABLE_Q}?select=*&order=id`),
  ]);

  // カテゴリテーブルから FILTER_DEFS を動的構築
  // 色は CATEGORY_STYLES で補完（なければ default）
  window._filterDefs = [
    { id: 'all', label: 'すべて', match: () => true },
    ...cats.map(c => ({
      id:    c.key,
      label: c.label,
      match: card => card.category === c.key,
    })),
  ];

  allCards = qs.map(normalizeSupabaseRow);
  setStatus(`✓ ${allCards.length}件`, 'ok');
}

function loadFromLocal() {
  allCards = CARDS.map((c, i) => ({
    id:       i,
    category: c.category || 'default',
    q:        c.q,
    a:        c.a,
    sub:      c.sub       || '',
    image_url:c.image_url || '',
  }));
  setStatus(`${allCards.length}件（ローカル）`, 'ok');
}

function normalizeSupabaseRow(r) {
  return {
    id:        r.id,
    category:  r.category || 'default',
    q:         r.question,
    a:         r.answer,
    sub:       r.explanation || '',
    image_url: r.image_url   || '',
  };
}

// ══════════════════════════════════════════════
// SUPABASE ユーティリティ
// ══════════════════════════════════════════════
async function sbFetch(path) {
  const res = await fetch(SUPABASE_URL + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

async function sbPost(path, body) {
  const res = await fetch(SUPABASE_URL + path, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

function setStatus(msg, cls) {
  const el = document.getElementById('sbStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'sb-status' + (cls ? ' ' + cls : '');
}

// ══════════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════════
function buildFilters() {
  const wrap = document.getElementById('startCats');
  if (!wrap) return;
  wrap.innerHTML = activeDefs().map(f => {
    const n = allCards.filter(f.match).length;
    return `<button class="start-cat ${f.id === selectedFilterId ? 'active' : ''}"
              data-filter="${f.id}" onclick="selectFilter('${f.id}')">
              ${f.label}
              <span class="filter-count">${n}</span>
            </button>`;
  }).join('');
}

function selectFilter(id) {
  selectedFilterId = id;
  document.querySelectorAll('.start-cat').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === id));
  updateStartMeta();
}

// アクティブなフィルター定義を返す
// Supabase 時は loadFromSupabase() で構築した window._filterDefs を使用
// ローカル時は data.js の FILTER_DEFS を使用
function activeDefs() {
  return (USE_SUPABASE ? window._filterDefs : null) || FILTER_DEFS;
}

function getFilter() {
  const defs = activeDefs();
  return defs.find(f => f.id === selectedFilterId) || defs[0];
}

// ══════════════════════════════════════════════
// START SCREEN
// ══════════════════════════════════════════════
function updateStartMeta() {
  const pool = allCards.filter(getFilter().match);
  const actual = selectedCount === 'all'
    ? pool.length : Math.min(Number(selectedCount), pool.length);
  const el = document.getElementById('startMeta');
  if (el) el.textContent = `出題: ${actual}問 / 対象: ${pool.length}問`;
}

function openStartScreen() {
  mastery = {};
  document.getElementById('startOverlay').style.display = 'flex';
  document.getElementById('completeOverlay').style.display = 'none';
  updateStartMeta();
}

function startStudy() {
  if (!allCards.length) { showToast('問題が読み込まれていません'); return; }
  document.getElementById('startOverlay').style.display = 'none';
  mastery = {};
  buildDeck();
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('startCount');
  if (sel) {
    sel.addEventListener('change', e => { selectedCount = e.target.value; updateStartMeta(); });
    selectedCount = sel.value;
  }
});

// ══════════════════════════════════════════════
// DECK
// ══════════════════════════════════════════════
function buildDeck() {
  let pool = allCards.filter(getFilter().match);
  pool = shuffle([...pool]);
  if (selectedCount !== 'all') {
    pool = pool.slice(0, Math.min(Number(selectedCount), pool.length));
  }
  deck = pool;
  deckIdx = 0; isFlipped = false;
  renderCard(); renderDots(); renderList();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ══════════════════════════════════════════════
// RENDER CARD
// ══════════════════════════════════════════════
function renderCard() {
  const body = document.getElementById('cardBody');
  body.classList.add('no-flip-transition');
  body.classList.remove('flipped');
  void body.offsetWidth;
  body.classList.remove('no-flip-transition');
  isFlipped = false;
  setMasteryActive(false);

  if (!deck.length) {
    document.getElementById('cardQuestion').textContent = '該当する問題がありません';
    document.getElementById('cardAnswer').textContent   = '';
    document.getElementById('cardSub').textContent      = '';
    document.getElementById('deckIndicator').textContent = '0 / 0';
    return;
  }

  const card  = deck[deckIdx];
  const total = deck.length;
  const col   = (CATEGORY_STYLES && CATEGORY_STYLES[card.category])
                  || CATEGORY_STYLES.default
                  || { text: '#2d6a4f', bg: '#e8f5e9', card: '#2d6a4f' };

  // フィルターラベルをバッジに使う（activeDefs() で Supabase/ローカルを統一参照）
  const filterDef = activeDefs().find(f => f.id === card.category);
  const label = filterDef ? filterDef.label : card.category;

  // バッジスタイルをインラインで適用（CSS にカテゴリ名をハードコードしない）
  [document.getElementById('frontBadge'), document.getElementById('backBadge')].forEach((b, i) => {
    b.textContent = label;
    if (i === 0) {
      b.style.color      = col.text;
      b.style.background = col.bg;
      b.style.borderColor = col.text + '44';
    } else {
      b.style.color      = 'rgba(255,255,255,0.75)';
      b.style.background = 'rgba(255,255,255,0.12)';
      b.style.borderColor = 'rgba(255,255,255,0.22)';
    }
  });

  // 裏面カード色
  const cardBack = document.querySelector('.card-back');
  if (cardBack) cardBack.style.background = col.card;

  // プログレス・ナビ
  document.getElementById('progressFill').style.width = ((deckIdx + 1) / total * 100) + '%';
  document.getElementById('deckIndicator').textContent = `${deckIdx + 1} / ${total}`;
  document.getElementById('prevBtn').disabled = deckIdx === 0;
  document.getElementById('nextBtn').disabled = deckIdx === total - 1;

  // テキスト
  document.getElementById('cardQuestion').textContent = card.q;
  document.getElementById('cardAnswer').textContent   = card.a;
  document.getElementById('cardSub').textContent      = card.sub || '';

  // 画像
  const img = document.getElementById('cardImage');
  if (card.image_url) { img.src = card.image_url; img.style.display = 'block'; }
  else img.style.display = 'none';

  renderDots(); renderList();
}

function renderDots() {
  const row = document.getElementById('masteryDots');
  if (deck.length > 60) { row.innerHTML = ''; return; }
  row.innerHTML = deck.map((c, i) =>
    `<div class="m-dot ${mastery[c.id] || ''} ${i === deckIdx ? 'current' : ''}"></div>`
  ).join('');
}

// ══════════════════════════════════════════════
// FLIP / TRANSITION
// ══════════════════════════════════════════════
function flipCard() {
  if (!deck.length || isTransitioning) return;
  isFlipped = !isFlipped;
  document.getElementById('cardBody').classList.toggle('flipped', isFlipped);
  setMasteryActive(isFlipped);
}

function setMasteryActive(on) {
  document.querySelectorAll('.mastery-btn').forEach(b => b.classList.toggle('active', on));
}

function transitionToCard(targetIdx, dir = 1) {
  if (!deck.length || targetIdx < 0 || targetIdx >= deck.length) return;
  if (targetIdx === deckIdx || isTransitioning) return;
  const scene = document.querySelector('.card-scene');
  if (!scene) { deckIdx = targetIdx; renderCard(); return; }

  isTransitioning = true;
  scene.classList.add('is-swapping');
  const outC = dir >= 0 ? 'swap-out-left'  : 'swap-out-right';
  const inC  = dir >= 0 ? 'swap-in-right'  : 'swap-in-left';
  scene.classList.add(outC);
  setTimeout(() => {
    scene.classList.remove(outC);
    deckIdx = targetIdx; renderCard();
    void scene.offsetWidth;
    scene.classList.add(inC);
    setTimeout(() => {
      scene.classList.remove(inC, 'is-swapping');
      isTransitioning = false;
    }, SWAP_IN_MS);
  }, SWAP_OUT_MS);
}

// ══════════════════════════════════════════════
// NAVIGATION / MASTERY
// ══════════════════════════════════════════════
function nextCard() {
  if (isTransitioning) return;
  deckIdx < deck.length - 1 ? transitionToCard(deckIdx + 1, 1) : showComplete();
}
function prevCard() {
  if (isTransitioning || deckIdx === 0) return;
  transitionToCard(deckIdx - 1, -1);
}

function markCard(level) {
  if (!isFlipped || !deck.length || isTransitioning) return;
  mastery[deck[deckIdx].id] = level;
  renderDots(); renderList();
  const btn = document.querySelectorAll('.mastery-btn')[{ forgot:0, unsure:1, knew:2 }[level]];
  btn.style.transform = 'scale(0.91)';
  setTimeout(() => { btn.style.transform = ''; }, 120);
  setTimeout(() => deckIdx < deck.length - 1 ? transitionToCard(deckIdx + 1, 1) : showComplete(), 230);
}

// ══════════════════════════════════════════════
// COMPLETE
// ══════════════════════════════════════════════
function showComplete() {
  const total  = deck.length;
  const knew   = Object.values(mastery).filter(v => v === 'knew').length;
  const unsure = Object.values(mastery).filter(v => v === 'unsure').length;
  const forgot = Object.values(mastery).filter(v => v === 'forgot').length;
  const unk    = total - knew - unsure - forgot;
  document.getElementById('completeStats').innerHTML = `
    <div class="stat-pill sp-knew"><span class="sp-n">${knew}</span><span class="sp-l">わかった</span></div>
    <div class="stat-pill sp-unsure"><span class="sp-n">${unsure}</span><span class="sp-l">あやふや</span></div>
    <div class="stat-pill sp-forgot"><span class="sp-n">${forgot}</span><span class="sp-l">わからない</span></div>
    ${unk > 0 ? `<div class="stat-pill"><span class="sp-n">${unk}</span><span class="sp-l">未確認</span></div>` : ''}
  `;
  document.getElementById('completeOverlay').style.display = 'flex';
}

function reviewWeak() {
  document.getElementById('completeOverlay').style.display = 'none';
  const weak = deck.filter(c => mastery[c.id] !== 'knew');
  if (!weak.length) { showToast('すべて「わかった」です！'); openStartScreen(); return; }
  deck = shuffle(weak); deckIdx = 0; mastery = {};
  renderCard(); renderDots(); renderList();
}

function restartDeck() {
  document.getElementById('completeOverlay').style.display = 'none';
  openStartScreen();
}

// ══════════════════════════════════════════════
// SIDE LIST
// ══════════════════════════════════════════════
function toggleList() {
  listOpen = !listOpen;
  document.getElementById('listPanel').classList.toggle('open', listOpen);
  document.getElementById('listArrow').innerHTML = listOpen ? '&#x2039;' : '&#x203A;';
}

function renderList() {
  const body = document.getElementById('listBody');
  body.innerHTML = deck.map((c, i) => {
    const txt = c.q.length > 38 ? c.q.slice(0, 38).replace(/\n/g,' ') + '…' : c.q.replace(/\n/g,' ');
    return `<div class="list-item ${i === deckIdx ? 'current' : ''}" onclick="jumpTo(${i})">
      <span class="li-n">${i + 1}</span>
      <span class="li-d ${mastery[c.id] || ''}"></span>
      <span class="li-t">${txt}</span>
    </div>`;
  }).join('');
  body.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
}

function jumpTo(idx) {
  if (isTransitioning) return;
  if (idx !== deckIdx) transitionToCard(idx, idx > deckIdx ? 1 : -1);
  if (window.innerWidth < 640) toggleList();
}

// ══════════════════════════════════════════════
// KEYBOARD
// ══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  switch (e.code) {
    case 'Space':      e.preventDefault(); flipCard();          break;
    case 'ArrowRight': nextCard();                              break;
    case 'ArrowLeft':  prevCard();                              break;
    case 'Digit1':     if (isFlipped) markCard('forgot');       break;
    case 'Digit2':     if (isFlipped) markCard('unsure');       break;
    case 'Digit3':     if (isFlipped) markCard('knew');         break;
  }
});

// ══════════════════════════════════════════════
// EDITOR（USE_SUPABASE = true のときのみ使用）
// ══════════════════════════════════════════════
function resetForm() {
  ['f_question','f_answer','f_explanation','f_imageUrl'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('f_imageFile').value = '';
}

function previewImage() {
  const url = document.getElementById('f_imageUrl').value.trim();
  document.getElementById('imagePreview').innerHTML = url
    ? `<img src="${url}" onerror="this.parentNode.innerHTML='<span class=img-err>読み込めません</span>'">`
    : '';
}

function handleImageFile() {
  const file = document.getElementById('f_imageFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('f_imageUrl').value = e.target.result;
    document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}">`;
  };
  reader.readAsDataURL(file);
}

function buildEditorCategorySelect() {
  const sel = document.getElementById('f_category');
  if (!sel) return;
  sel.innerHTML = activeDefs()
    .filter(f => f.id !== 'all')
    .map(f => `<option value="${f.id}">${f.label}</option>`)
    .join('');
}

async function saveQuestion() {
  if (!USE_SUPABASE) return;
  const question    = document.getElementById('f_question').value.trim();
  const answer      = document.getElementById('f_answer').value.trim();
  const category    = document.getElementById('f_category').value;
  const explanation = document.getElementById('f_explanation').value.trim();
  const image_url   = document.getElementById('f_imageUrl').value.trim();

  if (!question) { showToast('問題文を入力してください'); return; }
  if (!answer)   { showToast('答えを入力してください');   return; }

  try {
    const [row] = await sbPost(`/rest/v1/${SUPABASE_TABLE_Q}`,
      { category, question, answer, explanation, image_url });
    allCards.push(normalizeSupabaseRow(row));
    showToast('保存しました');
    resetForm();
    renderQList();
  } catch (e) {
    showToast('保存エラー: ' + e.message);
  }
}

function renderQList() {
  const list  = document.getElementById('qList');
  const count = document.getElementById('qListCount');
  if (!list) return;
  if (count) count.textContent = allCards.length + '件';

  if (!allCards.length) { list.innerHTML = '<p class="qlist-empty">問題がありません</p>'; return; }

  // FILTER_DEFS の順にグループ化
  const groups = {};
  activeDefs().filter(f => f.id !== 'all').forEach(f => { groups[f.id] = { label: f.label, items: [] }; });
  allCards.forEach(c => {
    if (!groups[c.category]) groups[c.category] = { label: c.category, items: [] };
    groups[c.category].items.push(c);
  });

  list.innerHTML = Object.entries(groups)
    .filter(([, g]) => g.items.length > 0)
    .map(([, g]) => `
      <details class="q-group">
        <summary class="q-group-header">
          <span class="qg-chevron">▶</span>
          <span>${g.label}</span>
          <span class="qg-count">${g.items.length}問</span>
        </summary>
        <div class="q-group-body">
          ${g.items.map((c, i) => `
            <div class="q-list-item">
              <span class="qli-n">${i + 1}</span>
              <span class="qli-t">${c.q.replace(/\n/g,' ').slice(0, 55)}${c.q.length > 55 ? '…' : ''}</span>
            </div>
          `).join('')}
        </div>
      </details>
    `).join('');
}

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
function exportCSV() {
  const rows = allCards.map(c =>
    [c.id, c.category, csvEsc(c.q), csvEsc(c.a),
     csvEsc(c.sub || ''), csvEsc(c.image_url || '')].join(','));
  dl('flashcards.csv',
    ['id,category,question,answer,explanation,image_url', ...rows].join('\n'),
    'text/csv;charset=utf-8');
}
function exportJSON() {
  dl('flashcards.json', JSON.stringify(allCards, null, 2), 'application/json');
}
function csvEsc(s) { return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }
function dl(name, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF'+content], {type:mime}));
  a.download = name; a.click();
}

// ══════════════════════════════════════════════
// TOAST / MODE
// ══════════════════════════════════════════════
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
}

function switchMode(mode) {
  document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.h-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + mode).classList.add('active');
  document.getElementById('htab-' + mode).classList.add('active');
  if (mode === 'editor') { buildEditorCategorySelect(); renderQList(); }
}