// ══════════════════════════════════════════════
// note-app.js  v2
// - buildNav() に nav-title-block を注入
//   （モバイルでは unit-nav 上部にタイトルを表示）
// ══════════════════════════════════════════════

let UNITS          = [];
let currentUnitIdx = 0;
let currentTab     = 'summary';
const mdCache      = {};

const _slug = new URLSearchParams(location.search).get('slug');
if (!_slug) {
  showSlugError('URLに ?slug=xxx が指定されていません');
} else {
  loadSlug(_slug);
}

function loadSlug(slug) {
  const script  = document.createElement('script');
  script.src    = `notes/${slug}/meta.js`;
  script.onload = () => {
    if (typeof UNITS_DATA === 'undefined') {
      showSlugError(`notes/${slug}/meta.js に UNITS_DATA が定義されていません`);
      return;
    }
    UNITS = UNITS_DATA;
    hideSlugLoading();
    applyMeta(slug);
    initApp();
  };
  script.onerror = () => {
    showSlugError(`notes/${slug}/meta.js が見つかりません`);
  };
  document.head.appendChild(script);
}

function hideSlugLoading() {
  document.getElementById('slugLoading').style.display = 'none';
  document.getElementById('main').style.display        = '';
}
function showSlugError(msg) {
  document.getElementById('slugLoading').style.display  = 'none';
  document.getElementById('slugError').style.display    = 'flex';
  document.getElementById('slugErrorMsg').textContent   = msg;
}

function applyMeta(slug) {
  const meta    = (typeof NOTE_META !== 'undefined') ? NOTE_META : {};
  const title   = meta.title   || slug;
  const subject = meta.subject || '';

  document.title = `${title} summary note — 451 Learning box`;
  // デスクトップ用ヘッダータイトル（class="header-title--desktop"）
  document.getElementById('headerTitle').textContent = title;
  // サブテキスト
  const sub = document.getElementById('headerSub');
  if (sub) sub.textContent = subject;
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
function initApp() {
  buildNav();
  navigateTo(0);

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'l') navigateTo(currentUnitIdx + 1);
    if (e.key === 'ArrowLeft'  || e.key === 'h') navigateTo(currentUnitIdx - 1);
    if (e.key === 's') switchTab('summary');
    if (e.key === 'q') switchTab('quiz');
    if (e.key === 'Escape') document.body.classList.remove('nav-open');
  });
}

// ══════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════
function buildNav() {
  const sidebar = document.getElementById('unitNav');

  // タイトル取得（NOTE_META から）
  const meta  = (typeof NOTE_META !== 'undefined') ? NOTE_META : {};
  const title = meta.title || _slug || 'まとめノート';

  // ── nav-title-block: CSS で display:none (desktop) / flex (mobile) ──
  const titleBlock = `
    <div class="nav-title-block" id="navTitleBlock">
      <span class="nav-title-block__text">${escHtml(title)}</span>
    </div>
  `;

  sidebar.innerHTML = titleBlock + `
    <p class="nav-section-label">Units</p>
    ${UNITS.map((u, i) => `
      <button class="nav-unit-btn" id="nav-${u.id}" onclick="navTo(${i})"
              style="--unit-color:${u.color}; --unit-color-light:${hexToLight(u.color)}">
        <span class="nav-num">${u.num}</span>
        <span class="nav-label">${u.title}</span>
        <span class="nav-quiz-dot" id="navdot-${u.id}"></span>
      </button>
    `).join('')}
  `;

  const toggle  = document.getElementById('navToggle');
  const overlay = document.getElementById('navOverlay');
  toggle.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  overlay.addEventListener('click', () => document.body.classList.remove('nav-open'));

  // unit ボタンをタップしたらモバイルでは閉じる
  sidebar.addEventListener('click', e => {
    if (e.target.closest('.nav-unit-btn') && window.innerWidth <= 768)
      document.body.classList.remove('nav-open');
  });
}

// nav-title-block の ✕ ボタン用
function closeNav() {
  document.body.classList.remove('nav-open');
}

function navTo(idx) { navigateTo(idx); }

// ══════════════════════════════════════════════
// NAVIGATE
// ══════════════════════════════════════════════
async function navigateTo(idx) {
  if (idx < 0 || idx >= UNITS.length) return;
  currentUnitIdx = idx;
  const unit = UNITS[idx];

  document.querySelectorAll('.nav-unit-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${unit.id}`);
  if (navBtn) navBtn.classList.add('active');

  const lightColor = hexToLight(unit.color);
  document.documentElement.style.setProperty('--unit-color',       unit.color);
  document.documentElement.style.setProperty('--unit-color-light',  lightColor);

  document.getElementById('headerSub').textContent  = `Unit ${unit.num}`;
  document.getElementById('unitNum').textContent    = `Unit ${unit.num}`;
  document.getElementById('unitTitle').textContent  = unit.title;
  document.getElementById('unitNumQ').textContent   = `Unit ${unit.num}`;
  document.getElementById('unitTitleQ').textContent = unit.title;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (currentTab === 'summary') await loadSummary(unit);
  else renderQuiz(unit);
}

// ══════════════════════════════════════════════
// TAB
// ══════════════════════════════════════════════
async function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabSummary').classList.toggle('active', tab === 'summary');
  document.getElementById('tabQuiz').classList.toggle('active',    tab === 'quiz');
  document.getElementById('panelSummary').style.display = 'none';
  document.getElementById('panelQuiz').style.display    = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';

  const unit = UNITS[currentUnitIdx];
  if (tab === 'summary') await loadSummary(unit);
  else renderQuiz(unit);
}

// ══════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════
async function loadSummary(unit) {
  const body    = document.getElementById('panelSummary');
  const loading = document.getElementById('loadingState');
  const error   = document.getElementById('errorState');
  const mdBody  = document.getElementById('markdownBody');

  body.style.display    = 'none';
  error.style.display   = 'none';
  loading.style.display = 'flex';

  try {
    let md;
    if (mdCache[unit.file]) {
      md = mdCache[unit.file];
    } else {
      const res = await fetch(unit.file);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      md = await res.text();
      mdCache[unit.file] = md;
    }
    //mdBody.innerHTML = marked.parse(md);
    // ⟦⟦…⟧⟧ をプレースホルダ化してからmarked → ヒントスパンに戻す
    const ph = [];
    const escaped = md.replace(/⟦⟦([\s\S]*?)⟧⟧/g, (_, t) => {
      ph.push(t);
      return `CLZPH_${ph.length - 1}_END`;
    });
    let html = marked.parse(escaped);
    html = html.replace(/CLZPH_(\d+)_END/g, (_, i) => {
      return `<span class="cloze-hint">${escHtml(ph[+i])}</span>`;
    });
mdBody.innerHTML = html;
    updateUnitMeta(unit);
    loading.style.display = 'none';
    body.style.display    = 'block';
  } catch(e) {
    loading.style.display = 'none';
    document.getElementById('errorMsg').textContent =
      `「${unit.file}」を読み込めませんでした: ${e.message}`;
    error.style.display = 'flex';
  }
}

function reloadUnit() {
  const unit = UNITS[currentUnitIdx];
  delete mdCache[unit.file];
  loadSummary(unit);
}

function updateUnitMeta(unit) {
  const el  = document.getElementById('unitProgress');
  const md  = mdCache[unit.file] || '';
  const cnt = (md.match(/⟦⟦[\s\S]*?⟧⟧/g) || []).length;
  el.textContent = cnt > 0 ? `穴埋め ${cnt}語` : '';
}

// ══════════════════════════════════════════════
// QUIZ（トグル方式）
// ══════════════════════════════════════════════
async function renderQuiz(unit) {
  document.getElementById('panelQuiz').style.display    = 'block';
  document.getElementById('panelSummary').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';

  const wrap = document.getElementById('quizWrap');

  // MD をキャッシュから取得（なければfetch）
  let md = mdCache[unit.file];
  if (!md) {
    try {
      const res = await fetch(unit.file);
      if (!res.ok) throw new Error(`${res.status}`);
      md = await res.text();
      mdCache[unit.file] = md;
    } catch(e) {
      wrap.innerHTML = `<p class="quiz-empty">MDの読み込みに失敗しました: ${e.message}</p>`;
      return;
    }
  }

  // ⟦⟦…⟧⟧ をプレースホルダに置換してからmarked → スパンに戻す
  const ph = [];
  const escaped = md.replace(/⟦⟦([\s\S]*?)⟧⟧/g, (_, t) => {
    ph.push(t);
    return `CLZPH_${ph.length - 1}_END`;
  });

  if (!ph.length) {
    wrap.innerHTML = `<p class="quiz-empty">このUnitには穴埋め（⟦⟦…⟧⟧）がありません。</p>`;
    updateClozeCount();
    return;
  }

  let html = marked.parse(escaped);
  html = html.replace(/CLZPH_(\d+)_END/g, (_, i) => {
    const text = escHtml(ph[+i]);
    return `<span class="cloze-word cloze-hidden" onclick="toggleCloze(this)" data-answer="${text}">${text}</span>`;
  });

  wrap.innerHTML = html;
  updateClozeCount();
}

function toggleCloze(el) {
  el.classList.toggle('cloze-hidden');
  el.classList.toggle('revealed');
  updateClozeCount();
}

function revealAll() {
  document.querySelectorAll('#quizWrap .cloze-word').forEach(el => {
    el.classList.remove('cloze-hidden');
    el.classList.add('revealed');
  });
  updateClozeCount();
}

function hideAll() {
  document.querySelectorAll('#quizWrap .cloze-word').forEach(el => {
    el.classList.add('cloze-hidden');
    el.classList.remove('revealed');
  });
  updateClozeCount();
}

function resetQuiz() {
  hideAll();
  showToast('リセットしました');
}

function updateClozeCount() {
  const all      = document.querySelectorAll('#quizWrap .cloze-word');
  const revealed = document.querySelectorAll('#quizWrap .cloze-word.revealed');
  const total    = all.length;
  const done     = revealed.length;
  const pct      = total ? Math.round(done / total * 100) : 0;

  document.getElementById('quizProgressFill').style.width = pct + '%';
  document.getElementById('quizScoreBig').textContent     = `${done} / ${total}`;

  // nav dot: 全部表示したら完了扱い
  const unit = UNITS[currentUnitIdx];
  const dot  = document.getElementById(`navdot-${unit.id}`);
  if (dot) dot.classList.toggle('done', total > 0 && done === total);
}


// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function hexToLight(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},0.09)`;
}

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