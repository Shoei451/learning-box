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
    mdBody.innerHTML = marked.parse(md);
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
  const el    = document.getElementById('unitProgress');
  const total = (unit.quiz || []).reduce((s, q) => s + q.blanks.length, 0);
  el.textContent = total > 0 ? `穴埋め ${total}問` : '';
}

// ══════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════
function renderQuiz(unit) {
  const questions = unit.quiz || [];
  document.getElementById('panelQuiz').style.display    = 'block';
  document.getElementById('panelSummary').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';

  const wrap = document.getElementById('quizWrap');
  if (!questions.length) {
    wrap.innerHTML = `<p class="quiz-empty">このUnitにはクイズがありません。</p>`;
    document.getElementById('quizScore').textContent          = '';
    document.getElementById('quizProgressFill').style.width   = '0%';
    return;
  }

  wrap.innerHTML = questions.map((q, qi) => {
    let blankIdx = 0;
    const qHtml  = escHtml(q.q).replace(/___/g, () => {
      const bi     = blankIdx;
      const answer = q.blanks[bi] || '';
      const hint   = (q.hints && q.hints[bi]) ? q.hints[bi] : '';
      blankIdx++;
      return `<span class="blank-wrapper">` +
        `<input class="blank" data-qi="${qi}" data-bi="${bi}"` +
        ` data-answer="${escHtml(answer)}"` +
        ` placeholder="${'　'.repeat(Math.max(2, Math.ceil(answer.length * 1.2)))}">` +
        (hint ? `<span class="hint-icon" title="${escHtml(hint)}">?</span>` : '') +
        `</span>`;
    });
    return `<div class="q-item" id="qitem-${qi}">
      <div class="q-label">Q${qi + 1}</div>
      <div class="q-text">${qHtml}</div>
      <div class="q-feedback" id="qfb-${qi}"></div>
    </div>`;
  }).join('');

  document.querySelectorAll('.blank').forEach(b => {
    fitBlank(b);
    b.addEventListener('input',   () => { fitBlank(b); updateQuizProgress(); });
    b.addEventListener('keydown', e => { if (e.key === 'Enter') focusNextBlank(b); });
  });

  document.getElementById('quizScore').textContent = '';
  updateQuizProgress();
}

function fitBlank(el) {
  let tmp = document.getElementById('_fitBlankTmp');
  if (!tmp) {
    tmp = document.createElement('span');
    tmp.id = '_fitBlankTmp';
    tmp.style.cssText =
      'visibility:hidden;position:absolute;pointer-events:none;' +
      'font-family:inherit;font-size:inherit;padding:0 0.4em;white-space:pre;';
    document.body.appendChild(tmp);
  }
  tmp.textContent = el.value || el.placeholder || '　　　';
  el.style.width  = Math.max(tmp.offsetWidth + 4, 48) + 'px';
}

function focusNextBlank(current) {
  const inputs = [...document.querySelectorAll('.blank')];
  const idx    = inputs.indexOf(current);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function updateQuizProgress() {
  const inputs = [...document.querySelectorAll('.blank')];
  const filled = inputs.filter(i => i.value.trim()).length;
  const pct    = inputs.length ? filled / inputs.length * 100 : 0;
  document.getElementById('quizProgressFill').style.width = pct + '%';
}

function checkQuiz() {
  const unit      = UNITS[currentUnitIdx];
  const questions = unit.quiz || [];
  if (!questions.length) return;

  let totalCorrect = 0;
  let totalBlanks  = 0;

  questions.forEach((q, qi) => {
    const item = document.getElementById(`qitem-${qi}`);
    const fb   = document.getElementById(`qfb-${qi}`);
    let qAllCorrect = true;

    q.blanks.forEach((ans, bi) => {
      const inp = document.querySelector(`.blank[data-qi="${qi}"][data-bi="${bi}"]`);
      if (!inp) return;
      totalBlanks++;
      const ok = normalizeAns(inp.value) === normalizeAns(ans);
      inp.classList.toggle('correct',   ok);
      inp.classList.toggle('incorrect', !ok);
      if (ok) { totalCorrect++; }
      else    { qAllCorrect = false; void inp.offsetWidth; }
    });

    item.classList.toggle('all-correct', qAllCorrect);
    item.classList.toggle('has-wrong',  !qAllCorrect);
    if (qAllCorrect) {
      fb.className = 'q-feedback fb-ok'; fb.textContent = '✓ 正解';
    } else {
      fb.className = 'q-feedback fb-ng'; fb.textContent = '✗ 正解: ' + q.blanks.join(' ／ ');
    }
  });

  const pct = totalBlanks ? Math.round(totalCorrect / totalBlanks * 100) : 0;
  document.getElementById('quizScore').textContent    = `${totalCorrect} / ${totalBlanks}  (${pct}%)`;
  document.getElementById('quizScoreBig').textContent = `${pct}%`;

  const dot = document.getElementById(`navdot-${unit.id}`);
  if (dot) dot.classList.toggle('done', pct === 100);

  updateQuizProgress();
  showToast(pct === 100 ? '🎉 全問正解！' : `${totalCorrect} / ${totalBlanks} 正解`);
}

function revealQuiz() {
  document.querySelectorAll('.blank').forEach(b => {
    b.value = b.dataset.answer;
    b.classList.remove('incorrect');
    b.classList.add('correct');
    fitBlank(b);
  });
  updateQuizProgress();
  checkQuiz();
}

function retryWrong() {
  let firstWrong = null;
  document.querySelectorAll('.blank').forEach(inp => {
    if (inp.classList.contains('incorrect')) {
      inp.value = '';
      inp.classList.remove('incorrect');
      fitBlank(inp);
      if (!firstWrong) firstWrong = inp;
    }
  });
  document.querySelectorAll('.q-item').forEach(item => item.classList.remove('has-wrong','all-correct'));
  document.querySelectorAll('.q-feedback').forEach(fb => {
    if (fb.classList.contains('fb-ng')) { fb.textContent = ''; fb.className = 'q-feedback'; }
  });
  document.getElementById('quizScore').textContent = '';
  if (firstWrong) firstWrong.focus();
  updateQuizProgress();
}

function resetQuiz() { renderQuiz(UNITS[currentUnitIdx]); }

function normalizeAns(s) {
  return (s || '').replace(/[　\s]/g,'').replace(/[、。，,・]/g,'').replace(/[（(）)]/g,'').toLowerCase();
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