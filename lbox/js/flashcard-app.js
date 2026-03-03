// ══════════════════════════════════════════════
// flashcard-app.js
// URLパラメータ ?slug=xxx から flashcards/{slug}.js を
// 動的に <script> 挿入して読み込み、初期化する
// ══════════════════════════════════════════════

const SWAP_OUT_MS = 130;
const SWAP_IN_MS  = 170;

// ── state ──
let allCards        = [];
let deck            = [];
let deckIdx         = 0;
let isFlipped       = false;
let isTransitioning = false;
let mastery         = {};
let listOpen        = false;
let shuffleOn       = false;
let selectedFilterId = 'all';
let selectedCount    = '20';

// ── slug読み込み ──────────────────────────────
const _slug = new URLSearchParams(location.search).get('slug');

if (!_slug) {
  showError('URLに ?slug=xxx が指定されていません');
} else {
  loadSlug(_slug);
}

function loadSlug(slug) {
  const script  = document.createElement('script');
  script.src    = `flashcards/${slug}.js`;
  script.onload = () => {
    // flashcards/{slug}.js が
    // CARDS, CATEGORY_STYLES, FILTER_DEFS, DECK_META をグローバルに定義している前提
    if (typeof CARDS === 'undefined') {
      showError(`flashcards/${slug}.js に CARDS が定義されていません`);
      return;
    }
    hideLoading();
    applyMeta();
    initApp();
  };
  script.onerror = () => {
    showError(`flashcards/${slug}.js が見つかりません`);
  };
  document.head.appendChild(script);
}

// ── loading / error UI ────────────────────────
function hideLoading() {
  document.getElementById('loadingScreen').style.display = 'none';
}
function showError(msg) {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('errorScreen').style.display   = 'flex';
  document.getElementById('errorMsg').textContent        = msg;
}

// ── メタ情報をHTMLに反映 ──────────────────────
// DECK_META = { title, subject } を flashcards/{slug}.js で定義する（任意）
function applyMeta() {
  const meta    = (typeof DECK_META !== 'undefined') ? DECK_META : {};
  const title   = meta.title   || _slug;
  const subject = meta.subject || '';

  document.title = `${title} — フラッシュカード`;
  document.getElementById('headerTitle').textContent  = title;
  document.getElementById('headerSub').textContent    = subject;
  document.getElementById('startTitle').textContent   = title;
  document.getElementById('startLabel').textContent   =
    subject ? `${subject} · Flashcards` : 'Flashcards';
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
function initApp() {
  // CARDS を内部形式に正規化
  // slug.js 側のフィールド: category, q, a, sub, image_url
  // label は category と同じ（上書き可）
  allCards = CARDS.map((c, i) => ({
    id:        i,
    category:  c.category || 'default',
    label:     c.label    || c.category || 'default',
    //type:      c.type     || '',
    q:         c.q,
    a:         c.a,
    sub:       c.sub       || '',
    image_url: c.image_url || '',
  }));


  buildFilters();
  updateStartMeta();
  openStartScreen();

  const sel = document.getElementById('startCount');
  if (sel) {
    sel.addEventListener('change', e => {
      selectedCount = e.target.value;
      updateStartMeta();
    });
    selectedCount = sel.value;
  }

  document.getElementById('shuffleBtn').addEventListener('click', () => {
    shuffleOn = !shuffleOn;
    document.getElementById('shuffleBtn').classList.toggle('active', shuffleOn);
    document.getElementById('shuffleLabel').textContent = shuffleOn ? 'on' : 'shuffle';
    showToast(shuffleOn ? 'シャッフル: ON' : 'シャッフル: OFF');
  });

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    switch (e.code) {
      case 'Space':      e.preventDefault(); flipCard(); break;
      case 'ArrowRight': nextCard(); break;
      case 'ArrowLeft':  prevCard(); break;
      case 'Digit1':     if (isFlipped) markCard('forgot'); break;
      case 'Digit2':     if (isFlipped) markCard('unsure'); break;
      case 'Digit3':     if (isFlipped) markCard('knew');   break;
    }
  });
}

// ══════════════════════════════════════════════
// FILTERS
// buildFilters() は FILTER_DEFS（slug.js で定義）があればそれを使う。
// なければ category から自動生成する。
// ══════════════════════════════════════════════
function buildFilters() {
  const defs = getFilterDefs();
  const wrap = document.getElementById('startCats');
  if (!wrap) return;

  wrap.innerHTML = defs.map(f => {
    const n = allCards.filter(f.match).length;
    return `<button class="start-cat ${f.id === selectedFilterId ? 'active' : ''}"
              data-filter="${f.id}" onclick="selectFilter('${f.id}')">
              ${f.label}
              <span style="font-size:0.65rem;opacity:0.65;margin-left:4px">${n}</span>
            </button>`;
  }).join('');
}

function getFilterDefs() {
  // slug.js 側で FILTER_DEFS を定義していればそちらを優先
  if (typeof FILTER_DEFS !== 'undefined' && FILTER_DEFS.length) {
    return FILTER_DEFS;
  }
  // なければ category から自動生成
  const cats = [...new Set(allCards.map(c => c.category))];
  return [
    { id: 'all', label: 'すべて', match: () => true },
    ...cats.map(cat => ({
      id:    cat,
      label: cat,
      match: c => c.category === cat,
    })),
  ];
}

function selectFilter(id) {
  selectedFilterId = id;
  document.querySelectorAll('.start-cat').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === id)
  );
  updateStartMeta();
}

// ══════════════════════════════════════════════
// START SCREEN
// ══════════════════════════════════════════════
function updateStartMeta() {
  const defs   = getFilterDefs();
  const filter = defs.find(f => f.id === selectedFilterId) || defs[0];
  const pool   = allCards.filter(filter.match);
  const actual = selectedCount === 'all'
    ? pool.length
    : Math.min(Number(selectedCount), pool.length);
  const el = document.getElementById('startMeta');
  if (el) el.textContent = `出題: ${actual}問 ／ 対象: ${pool.length}問`;
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

// ══════════════════════════════════════════════
// DECK
// ══════════════════════════════════════════════
function buildDeck() {
  const defs   = getFilterDefs();
  const filter = defs.find(f => f.id === selectedFilterId) || defs[0];
  let pool = allCards.filter(filter.match);

  if (shuffleOn) pool = shuffle([...pool]);
  if (selectedCount !== 'all') {
    pool = pool.slice(0, Math.min(Number(selectedCount), pool.length));
  }

  deck      = pool;
  deckIdx   = 0;
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

// ══════════════════════════════════════════════
// RENDER CARD
// ══════════════════════════════════════════════
function renderCard() {
  const body = document.getElementById('cardBody');
  body.classList.add('no-transition');
  body.classList.remove('flipped');
  void body.offsetWidth;
  body.classList.remove('no-transition');

  isFlipped = false;
  setMasteryActive(false);

  if (!deck.length) {
    document.getElementById('cardQuestion').textContent  = '該当する問題がありません';
    document.getElementById('cardAnswer').textContent    = '';
    document.getElementById('cardSub').textContent       = '';
    document.getElementById('deckIndicator').textContent = '0 / 0';
    updateProgress(0);
    return;
  }

  const card  = deck[deckIdx];
  const styles = (typeof CATEGORY_STYLES !== 'undefined') ? CATEGORY_STYLES : {};
  const col   = styles[card.category] || styles.default || { text:'#2d6a4f', bg:'#e8f5e9', card:'#2d6a4f' };

  // フロントバッジ
  // type が定義されていれば "label ｜ type" 形式、なければ label だけ
  const fb = document.getElementById('frontBadge');
  if (card.type) {
    const typeLabel = { name:'制度名', detail:'数値・内容', ox:'○×' }[card.type] || card.type;
    fb.innerHTML    = `${escHtml(card.label)}<span class="type-pip ${card.type}">${typeLabel}</span>`;
  } else {
    fb.textContent  = card.label;
  }
  fb.style.color      = col.text;
  fb.style.background = col.bg;
  fb.style.border     = `1px solid ${col.text}33`;

  document.getElementById('backBadge').textContent = card.label;

  const back = document.getElementById('cardBack');
  back.style.setProperty('--card-back-color', col.card);
  back.style.background = col.card;

  document.getElementById('cardQuestion').textContent = card.q;
  document.getElementById('cardAnswer').textContent   = card.a;
  document.getElementById('cardSub').textContent      = card.sub || '';

  const img = document.getElementById('cardImg');
  if (card.image_url) {
    img.src = card.image_url; img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  const total = deck.length;
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

// ── type-pip CSS（slug.jsにtype定義があるとき動的に注入）──
// flashcard-style.css に含めてもよいが、type使わないデッキでは不要なので動的追加
(function injectTypePipStyle() {
  const s = document.createElement('style');
  s.textContent = `
    .type-pip {
      font-family: var(--font-mono); font-size: 0.6rem;
      padding: 0.1rem 0.45rem; border-radius: 100px;
      margin-left: 0.3rem; vertical-align: middle; font-weight: 600;
    }
    .type-pip.name   { background: #e8f5e9; color: #2d6a4f; }
    .type-pip.detail { background: #fef3c7; color: #b45309; }
    .type-pip.ox     { background: #f3e8ff; color: #7c3aed; }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════
// FLIP
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

// ══════════════════════════════════════════════
// TRANSITION
// ══════════════════════════════════════════════
function transitionToCard(targetIdx, direction) {
  if (!deck.length || isTransitioning) return;
  if (targetIdx < 0 || targetIdx >= deck.length || targetIdx === deckIdx) return;

  isTransitioning = true;
  const scene = document.getElementById('cardScene');
  scene.classList.add('is-swapping');

  const outClass = direction >= 0 ? 'swap-out-left'  : 'swap-out-right';
  const inClass  = direction >= 0 ? 'swap-in-right'  : 'swap-in-left';

  scene.classList.add(outClass);
  setTimeout(() => {
    scene.classList.remove(outClass);
    deckIdx = targetIdx;
    renderCard();
    void scene.offsetWidth;
    scene.classList.add(inClass);
    setTimeout(() => {
      scene.classList.remove(inClass, 'is-swapping');
      isTransitioning = false;
    }, SWAP_IN_MS);
  }, SWAP_OUT_MS);
}

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function nextCard() {
  if (isTransitioning) return;
  if (deckIdx < deck.length - 1) transitionToCard(deckIdx + 1, 1);
  else showComplete();
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

// ══════════════════════════════════════════════
// MASTERY
// ══════════════════════════════════════════════
function markCard(level) {
  if (!isFlipped || !deck.length || isTransitioning) return;
  mastery[deckIdx] = level;
  renderDots();
  renderList();

  const idxMap = { forgot: 0, unsure: 1, knew: 2 };
  const btn    = document.querySelectorAll('.mastery-btn')[idxMap[level]];
  if (btn) {
    btn.style.transform = 'scale(0.91)';
    setTimeout(() => { btn.style.transform = ''; }, 130);
  }

  setTimeout(() => {
    if (deckIdx < deck.length - 1) transitionToCard(deckIdx + 1, 1);
    else showComplete();
  }, 240);
}

// ══════════════════════════════════════════════
// MASTERY DOTS
// ══════════════════════════════════════════════
function renderDots() {
  const row = document.getElementById('masteryDots');
  if (!deck.length || deck.length > 60) { row.innerHTML = ''; return; }
  row.innerHTML = deck.map((_, i) => {
    const m = mastery[i] || '';
    return `<div class="m-dot ${m} ${i === deckIdx ? 'current' : ''}"></div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// COMPLETE
// ══════════════════════════════════════════════
function showComplete() {
  const total  = deck.length;
  const knew   = Object.values(mastery).filter(v => v === 'knew').length;
  const unsure = Object.values(mastery).filter(v => v === 'unsure').length;
  const forgot = Object.values(mastery).filter(v => v === 'forgot').length;
  const skip   = total - knew - unsure - forgot;

  document.getElementById('completeStats').innerHTML = `
    <div class="stat-pill sp-knew">  <span class="sp-n">${knew}</span>  <span class="sp-l">わかった</span></div>
    <div class="stat-pill sp-unsure"><span class="sp-n">${unsure}</span><span class="sp-l">あやふや</span></div>
    <div class="stat-pill sp-forgot"><span class="sp-n">${forgot}</span><span class="sp-l">わからない</span></div>
    ${skip > 0 ? `<div class="stat-pill"><span class="sp-n">${skip}</span><span class="sp-l">未確認</span></div>` : ''}
  `;

  // カテゴリ別内訳
  const catMap = {};
  deck.forEach((card, i) => {
    const key = card.category;
    if (!catMap[key]) catMap[key] = { label: card.label, knew: 0, total: 0 };
    catMap[key].total++;
    if (mastery[i] === 'knew') catMap[key].knew++;
  });
  document.getElementById('completeBreakdown').innerHTML =
    Object.values(catMap).map(c => {
      const pct = c.total ? Math.round(c.knew / c.total * 100) : 0;
      return `<div class="breakdown-row">
        <span class="breakdown-label">${c.label}</span>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct}%"></div></div>
        <span class="breakdown-num">${c.knew}/${c.total}</span>
      </div>`;
    }).join('');

  document.getElementById('completeOverlay').style.display = 'flex';
}

function reviewWeak() {
  document.getElementById('completeOverlay').style.display = 'none';
  const weak = deck.filter((_, i) => mastery[i] !== 'knew');
  if (!weak.length) { showToast('すべて「わかった」です！'); restartDeck(); return; }
  deck      = shuffle(weak);
  deckIdx   = 0;
  mastery   = {};
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
  document.getElementById('listArrow').textContent = listOpen ? '‹' : '›';
}

function renderList() {
  const body = document.getElementById('listBody');
  if (!body || !deck.length) { if (body) body.innerHTML = ''; return; }

  body.innerHTML = deck.map((card, i) => {
    const m   = mastery[i] || '';
    const txt = card.q.length > 36
      ? card.q.slice(0, 36).replace(/\n/g, ' ') + '…'
      : card.q.replace(/\n/g, ' ');
    return `<div class="list-item ${i === deckIdx ? 'current' : ''}" onclick="jumpTo(${i})">
      <span class="li-n">${i + 1}</span>
      <span class="li-d ${m}"></span>
      <span class="li-t">${txt}</span>
    </div>`;
  }).join('');

  const cur = body.querySelector('.current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
}
