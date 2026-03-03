// ═══════════════════════════════════════════════
// app.js — まとめノート v2
// Quiz パネルは blank_notes スタイル（fitBlank + data-answer）
// ═══════════════════════════════════════════════

// ──────────────────────────────────────────────
// UNITS 定義
// ──────────────────────────────────────────────
const UNITS = [
  {
    id:    'u01',
    num:   '01',
    title: 'サンプル Unit 01',
    file:  'units/01.md',
    color: '#2d6a4f',

    // クイズ: q の中の ___ が入力欄になる
    // blanks: 左から順番に正解の配列
    // hint（任意）: 各 blank に対応するヒント文字列の配列（null で非表示）
    quiz: [
      {
        q:      '人間はおよそ1年の ___ と表現されるほど未熟な状態で生まれる。これを提唱したのは ___ である。',
        blanks: ['生理的早産', 'ポルトマン'],
        hints:  ['生理的◯◯', null],
      },
      {
        q:      '誕生から ___ までを特に新生児期という。',
        blanks: ['4週間'],
        hints:  [null],
      },
    ],
  },
  {
    id:    'u02',
    num:   '02',
    title: 'サンプル Unit 02',
    file:  'units/02.md',
    color: '#2563eb',

    quiz: [
      {
        q:      '受精後 ___ 日目に受精卵が子宮内膜に着床する。',
        blanks: ['6〜7'],
        hints:  [null],
      },
      {
        q:      '妊娠 ___ 週（10か月）前後で出生となる。',
        blanks: ['40'],
        hints:  [null],
      },
    ],
  },
];

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let currentUnitIdx = 0;
let currentTab     = 'summary';
const mdCache      = {};

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
(function init() {
  buildNav();
  navigateTo(0);
})();

// ──────────────────────────────────────────────
// NAV
// ──────────────────────────────────────────────
function buildNav() {
  const sidebar = document.getElementById('unitNav');
  sidebar.innerHTML = `
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
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('nav-open');
  });
  sidebar.addEventListener('click', e => {
    if (e.target.closest('.nav-unit-btn') && window.innerWidth <= 768)
      document.body.classList.remove('nav-open');
  });
}

function navTo(idx) { navigateTo(idx); }

// ──────────────────────────────────────────────
// NAVIGATE
// ──────────────────────────────────────────────
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

  document.getElementById('headerSub').textContent = `Unit ${unit.num}`;
  document.getElementById('unitNum').textContent   = `Unit ${unit.num}`;
  document.getElementById('unitTitle').textContent = unit.title;
  document.getElementById('unitNumQ').textContent  = `Unit ${unit.num}`;
  document.getElementById('unitTitleQ').textContent = unit.title;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (currentTab === 'summary') await loadSummary(unit);
  else renderQuiz(unit);
}

// ──────────────────────────────────────────────
// TAB
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────
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
  const el = document.getElementById('unitProgress');
  const total = (unit.quiz || []).reduce((s, q) => s + q.blanks.length, 0);
  el.textContent = total > 0 ? `穴埋め ${total}問` : '';
}

// ──────────────────────────────────────────────
// QUIZ（blank_notes スタイル）
// ──────────────────────────────────────────────
function renderQuiz(unit) {
  const questions = unit.quiz || [];
  document.getElementById('panelQuiz').style.display    = 'block';
  document.getElementById('panelSummary').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';

  const wrap = document.getElementById('quizWrap');

  if (!questions.length) {
    wrap.innerHTML = `<p class="quiz-empty">このUnitにはクイズがありません。</p>`;
    document.getElementById('quizScore').textContent = '';
    document.getElementById('quizProgressFill').style.width = '0%';
    return;
  }

  // ___ を <span class="blank-wrapper"><input...></span> に置き換え
  wrap.innerHTML = questions.map((q, qi) => {
    let blankIdx = 0;
    // テキストをHTMLエスケープしてから ___ を input に変換
    const qHtml = escHtml(q.q).replace(/___/g, () => {
      const bi      = blankIdx;
      const answer  = q.blanks[bi] || '';
      const hint    = (q.hints && q.hints[bi]) ? q.hints[bi] : '';
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

  // blank 初期化: fitBlank + イベント
  document.querySelectorAll('.blank').forEach(b => {
    fitBlank(b);
    b.addEventListener('input',   () => { fitBlank(b); updateQuizProgress(); });
    b.addEventListener('keydown', e => { if (e.key === 'Enter') focusNextBlank(b); });
  });

  document.getElementById('quizScore').textContent = '';
  updateQuizProgress();
}

// ── blank 幅自動調整（blank_notes の fitBlank）──
function fitBlank(el) {
  // 計算用の invisible span を使う
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

// ── 採点 ──
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
      if (ok) {
        totalCorrect++;
        inp.classList.add('shake-off');
      } else {
        qAllCorrect = false;
        // shake アニメーション
        inp.classList.remove('shake-off');
        void inp.offsetWidth;
      }
    });

    item.classList.toggle('all-correct', qAllCorrect);
    item.classList.toggle('has-wrong',   !qAllCorrect);

    if (qAllCorrect) {
      fb.className   = 'q-feedback fb-ok';
      fb.textContent = '✓ 正解';
    } else {
      fb.className   = 'q-feedback fb-ng';
      fb.textContent = '✗ 正解: ' + q.blanks.join(' ／ ');
    }
  });

  const pct = totalBlanks ? Math.round(totalCorrect / totalBlanks * 100) : 0;
  document.getElementById('quizScore').textContent = `${totalCorrect} / ${totalBlanks}  (${pct}%)`;

  // ナビの dot を更新
  const dot = document.getElementById(`navdot-${unit.id}`);
  if (dot) dot.classList.toggle('done', pct === 100);

  updateQuizProgress();
  showToast(pct === 100 ? '🎉 全問正解！' : `${totalCorrect} / ${totalBlanks} 正解`);
}

// ── 答えを全表示 ──
function revealQuiz() {
  const unit = UNITS[currentUnitIdx];
  document.querySelectorAll('.blank').forEach(b => {
    b.value = b.dataset.answer;
    b.classList.remove('incorrect');
    b.classList.add('correct');
    fitBlank(b);
  });
  updateQuizProgress();
  // 採点も実行してスコア表示
  checkQuiz();
}

// ── 間違いのみ再挑戦 ──
function retryWrong() {
  const inputs = [...document.querySelectorAll('.blank')];
  let firstWrong = null;
  inputs.forEach(inp => {
    if (inp.classList.contains('incorrect')) {
      inp.value = '';
      inp.classList.remove('incorrect');
      fitBlank(inp);
      if (!firstWrong) firstWrong = inp;
    }
  });
  document.querySelectorAll('.q-item').forEach(item => item.classList.remove('has-wrong', 'all-correct'));
  document.querySelectorAll('.q-feedback').forEach(fb => {
    if (fb.classList.contains('fb-ng')) { fb.textContent = ''; fb.className = 'q-feedback'; }
  });
  document.getElementById('quizScore').textContent = '';
  if (firstWrong) firstWrong.focus();
  updateQuizProgress();
}

// ── リセット ──
function resetQuiz() {
  renderQuiz(UNITS[currentUnitIdx]);
}

// ── 正規化（スペース・句読点・大小文字を無視）──
function normalizeAns(s) {
  return (s || '').replace(/[　\s]/g,'').replace(/[、。，,・]/g,'').replace(/[（(）)]/g,'').toLowerCase();
}

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// KEYBOARD
// ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'l') navigateTo(currentUnitIdx + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'h') navigateTo(currentUnitIdx - 1);
  if (e.key === 's') switchTab('summary');
  if (e.key === 'q') switchTab('quiz');
});
