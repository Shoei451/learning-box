// ═══════════════════════════════════════════════
// app.js — フラッシュカード テンプレート
// ═══════════════════════════════════════════════


// ═══════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════
const SWAP_OUT_MS = 140;
const SWAP_IN_MS  = 180;

// ═══════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════
let allCards        = [...CARDS];
let deck            = [];
let deckIdx         = 0;
let isFlipped       = false;
let isTransitioning = false;
let mastery         = {};   // { idx: 'knew' | 'unsure' | 'forgot' }
let listOpen        = false;
let shuffleOn       = false;

// Start screen state
let selectedFilterId = FILTERS[0].id;
let selectedCount    = '20';

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
(function init() {
  buildStartCats();
  bindStartCount();
  updateStartMeta();
  openStartScreen();
  renderList();          // list 初期化（空）
})();

// ═══════════════════════════════════════════════
// START SCREEN
// ═══════════════════════════════════════════════
function buildStartCats() {
  const wrap = document.getElementById('startCats');
  wrap.innerHTML = FILTERS.map(f => {
    const n = allCards.filter(f.match).length;
    return `<button class="start-cat ${f.id === selectedFilterId ? 'active' : ''}"
              data-filter="${f.id}"
              onclick="selectFilter('${f.id}')">
              ${f.label}
              <span style="font-size:0.65rem;opacity:0.7;margin-left:4px">${n}</span>
            </button>`;
  }).join('');
}

function selectFilter(id) {
  selectedFilterId = id;
  document.querySelectorAll('.start-cat').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === id);
  });
  updateStartMeta();
}

function bindStartCount() {
  const sel = document.getElementById('startCount');
  sel.addEventListener('change', e => {
    selectedCount = e.target.value;
    updateStartMeta();
  });
  selectedCount = sel.value;
}

function updateStartMeta() {
  const filter  = FILTERS.find(f => f.id === selectedFilterId) || FILTERS[0];
  const pool    = allCards.filter(filter.match);
  const actual  = selectedCount === 'all'
    ? pool.length
    : Math.min(Number(selectedCount), pool.length);

  document.getElementById('startMeta').textContent =
    `出題: ${actual}問 ／ 対象: ${pool.length}問`;
}

function openStartScreen() {
  mastery = {};
  document.getElementById('startOverlay').classList.remove('hidden');
  document.getElementById('completeOverlay').style.display = 'none';
  updateStartMeta();
}

function startStudy() {
  document.getElementById('startOverlay').classList.add('hidden');
  mastery = {};
  buildDeck();
}

// ═══════════════════════════════════════════════
// DECK
// ═══════════════════════════════════════════════
function buildDeck() {
  const filter = FILTERS.find(f => f.id === selectedFilterId) || FILTERS[0];
  let pool     = allCards.filter(filter.match);

  pool = shuffle([...pool]);

  if (selectedCount !== 'all') {
    pool = pool.slice(0, Math.min(Number(selectedCount), pool.length));
  }

  if (!shuffleOn) {
    // 元の CARDS 配列の順序を維持
    const poolSet = new Set(pool.map(c => c));
    pool = allCards.filter(c => poolSet.has(c)).slice(0, pool.length);
  }

  deck    = pool;
  deckIdx = 0;
  isFlipped = false;

  renderCard();
  renderDots();
  renderList();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══════════════════════════════════════════════
// RENDER CARD（フリップ状態を必ずリセット）
// ═══════════════════════════════════════════════
function renderCard() {
  // ── 1. カードを即座にフロント面に戻す（アニメなし）
  const body = document.getElementById('cardBody');
  body.classList.add('no-transition');
  body.classList.remove('flipped');
  void body.offsetWidth;                 // reflow で no-transition を確定させる
  body.classList.remove('no-transition');

  isFlipped = false;
  setMasteryActive(false);

  if (!deck.length) {
    document.getElementById('cardQuestion').textContent = '該当する問題がありません';
    document.getElementById('cardAnswer').textContent   = '';
    document.getElementById('cardSub').textContent      = '';
    document.getElementById('deckIndicator').textContent = '0 / 0';
    updateProgress(0);
    return;
  }

  const card  = deck[deckIdx];
  const total = deck.length;
  const col   = CATEGORY_STYLES[card.cat] || CATEGORY_STYLES.default;

  // ── 2. フロントバッジ
  const fb = document.getElementById('frontBadge');
  fb.textContent    = card.label;
  fb.style.color      = col.text;
  fb.style.background = col.bg;
  fb.style.border     = `1px solid ${col.text}33`;

  // ── 3. バックバッジ・色
  document.getElementById('backBadge').textContent = card.label;
  document.getElementById('cardBack').style.setProperty(
    '--card-back-color', col.card
  );
  document.getElementById('cardBack').style.background = col.card;

  // ── 4. テキスト
  document.getElementById('cardQuestion').textContent = card.q;
  document.getElementById('cardAnswer').textContent   = card.a;
  document.getElementById('cardSub').textContent      = card.sub || '';

  // ── 5. ナビ
  document.getElementById('deckIndicator').textContent = `${deckIdx + 1} / ${total}`;
  document.getElementById('prevBtn').disabled = deckIdx === 0;
  document.getElementById('nextBtn').disabled = deckIdx === total - 1;
  updateProgress((deckIdx + 1) / total);

  renderDots();
  renderList();
}

function updateProgress(ratio) {
  document.getElementById('progressFill').style.width = (ratio * 100) + '%';
}

// ═══════════════════════════════════════════════
// FLIP
// ═══════════════════════════════════════════════
function flipCard() {
  if (!deck.length || isTransitioning) return;
  isFlipped = !isFlipped;
  document.getElementById('cardBody').classList.toggle('flipped', isFlipped);
  setMasteryActive(isFlipped);
}

function setMasteryActive(on) {
  document.querySelectorAll('.mastery-btn').forEach(b => b.classList.toggle('active', on));
}

// ═══════════════════════════════════════════════
// TRANSITION（swap アニメーション）
// ── ここが「答えが見えない」の核心 ──
// 流れ: swap-out → renderCard()（フロントに戻す）→ swap-in
// ═══════════════════════════════════════════════
function transitionToCard(targetIdx, direction) {
  if (!deck.length) return;
  if (targetIdx < 0 || targetIdx >= deck.length) return;
  if (targetIdx === deckIdx) return;
  if (isTransitioning) return;

  isTransitioning = true;
  const scene = document.getElementById('cardScene');
  scene.classList.add('is-swapping');
  scene.classList.remove(
    'swap-out-left', 'swap-out-right', 'swap-in-left', 'swap-in-right'
  );

  const outClass = direction >= 0 ? 'swap-out-left'  : 'swap-out-right';
  const inClass  = direction >= 0 ? 'swap-in-right'  : 'swap-in-left';

  // Phase 1: 現カードをフェードアウト
  scene.classList.add(outClass);

  setTimeout(() => {
    scene.classList.remove(outClass);

    // Phase 2: データを差し替え（この時点でカードは見えない）
    deckIdx = targetIdx;
    renderCard();          // ← フロント面に瞬時リセット済み

    void scene.offsetWidth; // reflow

    // Phase 3: 新カードをフェードイン
    scene.classList.add(inClass);

    setTimeout(() => {
      scene.classList.remove(inClass);
      scene.classList.remove('is-swapping');
      isTransitioning = false;
    }, SWAP_IN_MS);

  }, SWAP_OUT_MS);
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function nextCard() {
  if (isTransitioning) return;
  if (deckIdx < deck.length - 1) {
    transitionToCard(deckIdx + 1, 1);
  } else {
    showComplete();
  }
}

function prevCard() {
  if (isTransitioning) return;
  if (deckIdx > 0) transitionToCard(deckIdx - 1, -1);
}

function jumpTo(idx) {
  if (isTransitioning || idx === deckIdx) return;
  transitionToCard(idx, idx > deckIdx ? 1 : -1);
  if (window.innerWidth < 640) toggleList();
}

// ═══════════════════════════════════════════════
// MASTERY
// ═══════════════════════════════════════════════
function markCard(level) {
  if (!isFlipped || !deck.length || isTransitioning) return;

  mastery[deckIdx] = level;
  renderDots();
  renderList();

  // ボタン押下フィードバック
  const idxMap = { forgot: 0, unsure: 1, knew: 2 };
  const btn = document.querySelectorAll('.mastery-btn')[idxMap[level]];
  if (btn) {
    btn.style.transform = 'scale(0.91)';
    setTimeout(() => { btn.style.transform = ''; }, 130);
  }

  // 少し待ってから次へ
  setTimeout(() => {
    if (deckIdx < deck.length - 1) transitionToCard(deckIdx + 1, 1);
    else showComplete();
  }, 240);
}

// ═══════════════════════════════════════════════
// DOTS
// ═══════════════════════════════════════════════
function renderDots() {
  const row = document.getElementById('masteryDots');
  if (!deck.length || deck.length > 60) { row.innerHTML = ''; return; }
  row.innerHTML = deck.map((_, i) => {
    const m = mastery[i] || '';
    return `<div class="m-dot ${m} ${i === deckIdx ? 'current' : ''}" title="${deck[i].a}"></div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// COMPLETE
// ═══════════════════════════════════════════════
function showComplete() {
  const total  = deck.length;
  const knew   = Object.values(mastery).filter(v => v === 'knew').length;
  const unsure = Object.values(mastery).filter(v => v === 'unsure').length;
  const forgot = Object.values(mastery).filter(v => v === 'forgot').length;
  const skip   = total - knew - unsure - forgot;

  // Stat pills
  document.getElementById('completeStats').innerHTML = `
    <div class="stat-pill sp-knew">
      <span class="sp-n">${knew}</span><span class="sp-l">わかった</span>
    </div>
    <div class="stat-pill sp-unsure">
      <span class="sp-n">${unsure}</span><span class="sp-l">あやふや</span>
    </div>
    <div class="stat-pill sp-forgot">
      <span class="sp-n">${forgot}</span><span class="sp-l">わからない</span>
    </div>
    ${skip > 0
      ? `<div class="stat-pill"><span class="sp-n">${skip}</span><span class="sp-l">未確認</span></div>`
      : ''}
  `;

  // Category breakdown
  const catMap = {};
  deck.forEach((card, i) => {
    if (!catMap[card.cat]) catMap[card.cat] = { label: card.label, knew: 0, total: 0 };
    catMap[card.cat].total++;
    if (mastery[i] === 'knew') catMap[card.cat].knew++;
  });
  const bdHTML = Object.values(catMap).map(c => {
    const pct = c.total ? Math.round(c.knew / c.total * 100) : 0;
    return `
      <div class="breakdown-row">
        <span class="breakdown-label">${c.label}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${pct}%"></div>
        </div>
        <span class="breakdown-num">${c.knew}/${c.total}</span>
      </div>`;
  }).join('');
  document.getElementById('completeBreakdown').innerHTML = bdHTML;

  document.getElementById('completeOverlay').style.display = 'flex';
}

function reviewWeak() {
  document.getElementById('completeOverlay').style.display = 'none';
  const weak = deck.filter((_, i) => mastery[i] !== 'knew');
  if (!weak.length) { showToast('すべて「わかった」です！'); restartDeck(); return; }
  deck    = shuffle(weak);
  deckIdx = 0;
  mastery = {};
  renderCard();
  renderDots();
  renderList();
}

function restartDeck() {
  document.getElementById('completeOverlay').style.display = 'none';
  openStartScreen();
}

// ═══════════════════════════════════════════════
// SIDE LIST
// ═══════════════════════════════════════════════
function toggleList() {
  listOpen = !listOpen;
  document.getElementById('listPanel').classList.toggle('open', listOpen);
  document.getElementById('listArrow').textContent = listOpen ? '‹' : '›';
}

function renderList() {
  const body = document.getElementById('listBody');
  if (!deck.length) { body.innerHTML = ''; return; }

  body.innerHTML = deck.map((card, i) => {
    const m   = mastery[i] || '';
    const txt = card.q.length > 36 ? card.q.slice(0, 36).replace(/\n/g, ' ') + '…' : card.q.replace(/\n/g, ' ');
    return `<div class="list-item ${i === deckIdx ? 'current' : ''}" onclick="jumpTo(${i})">
      <span class="li-n">${i + 1}</span>
      <span class="li-d ${m}"></span>
      <span class="li-t">${txt}</span>
    </div>`;
  }).join('');

  const cur = body.querySelector('.current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

// ═══════════════════════════════════════════════
// SHUFFLE TOGGLE
// ═══════════════════════════════════════════════
document.getElementById('shuffleBtn').addEventListener('click', () => {
  shuffleOn = !shuffleOn;
  document.getElementById('shuffleBtn').classList.toggle('active', shuffleOn);
  document.getElementById('shuffleLabel').textContent = shuffleOn ? 'on' : 'shuffle';
  showToast(shuffleOn ? 'シャッフル: ON' : 'シャッフル: OFF');
});

// ═══════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  switch (e.code) {
    case 'Space':
      e.preventDefault(); flipCard(); break;
    case 'ArrowRight':
      nextCard(); break;
    case 'ArrowLeft':
      prevCard(); break;
    case 'Digit1':
      if (isFlipped) markCard('forgot'); break;
    case 'Digit2':
      if (isFlipped) markCard('unsure'); break;
    case 'Digit3':
      if (isFlipped) markCard('knew'); break;
  }
});

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
}
