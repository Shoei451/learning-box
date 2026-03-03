// ═══════════════════════════════════════════════
// app.js — まとめノート テンプレート
// ═══════════════════════════════════════════════

// ──────────────────────────────────────────────
// UNITS 定義
// 各unitの情報とクイズデータをここに書く
// Markdownファイルは units/ フォルダに置く
// ──────────────────────────────────────────────
const UNITS = [
  {
    id:    'u01',
    num:   '01',
    title: 'サンプル Unit 01',
    file:  'units/01.md',        // Markdownファイルのパス
    color: '#2d6a4f',            // このunitのアクセントカラー

    // クイズ: 問題文中の ___ が入力欄になる
    // blanks: 左から順番に対応する正答の配列
    quiz: [
      {
        q:      '人間はおよそ1年の___ と表現されるほど未熟な状態で生まれる。これを提唱したのは ___である。',
        blanks: ['生理的早産', 'ポルトマン'],
      },
      {
        q:      '誕生から___までを特に新生児期という。',
        blanks: ['4週間'],
      },
      {
        q:      '生後1週間、体重が約1割減少する現象を___という。',
        blanks: ['生理的体重減少'],
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
        q:      '受精後___日目に受精卵が子宮内膜に着床する。',
        blanks: ['6〜7'],
      },
      {
        q:      '妊娠___週（10か月）前後で出生となる。',
        blanks: ['40'],
      },
    ],
  },
  // ↑ ここにunitを追加していく
];

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let currentUnitIdx = 0;
let currentTab     = 'summary';   // 'summary' | 'quiz'
let quizState      = null;        // { inputs, correct[] } — renderQuiz後に設定

// Markdownキャッシュ（fetchを何度もしない）
const mdCache = {};

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
(function init() {
  buildNav();
  navigateTo(0);
})();

// ──────────────────────────────────────────────
// NAV BUILD + OVERLAY CONTROL
// ──────────────────────────────────────────────
function buildNav() {
  // ── Sidebar
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

  // ── Hamburger toggle (mobile)
  const toggle  = document.getElementById('navToggle');
  const overlay = document.getElementById('navOverlay');

  function openNav()  { document.body.classList.add('nav-open'); }
  function closeNav() { document.body.classList.remove('nav-open'); }

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });
  overlay.addEventListener('click', closeNav);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });

  // サイドバー内でunit選択したらモバイルでは自動で閉じる
  sidebar.addEventListener('click', e => {
    if (e.target.closest('.nav-unit-btn') && window.innerWidth <= 768) {
      closeNav();
    }
  });
}

// navigateTo のラッパー（サイドバーのonclickから呼ぶ）
function navTo(idx) { navigateTo(idx); }

// ──────────────────────────────────────────────
// NAVIGATE (unit切り替えの中心)
// ──────────────────────────────────────────────
async function navigateTo(idx) {
  if (idx < 0 || idx >= UNITS.length) return;

  currentUnitIdx = idx;
  quizState = null;

  const unit = UNITS[idx];

  // 1. ナビのactive状態を更新
  document.querySelectorAll('.nav-unit-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${unit.id}`);
  if (navBtn) navBtn.classList.add('active');

  // 2. CSS変数でunitカラーを注入
  const lightColor = hexToLight(unit.color);
  document.documentElement.style.setProperty('--unit-color',       unit.color);
  document.documentElement.style.setProperty('--unit-color-light',  lightColor);

  // 3. ヘッダーsubを更新
  document.getElementById('headerSub').textContent = `Unit ${unit.num}`;

  // 4. unit番号・タイトルを両タブにセット
  document.getElementById('unitNum').textContent   = `Unit ${unit.num}`;
  document.getElementById('unitTitle').textContent = unit.title;
  document.getElementById('unitNumQ').textContent  = `Unit ${unit.num}`;
  document.getElementById('unitTitleQ').textContent = unit.title;

  // 5. ページ上部へスクロール
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 6. 現在のタブを再描画
  if (currentTab === 'summary') {
    await loadSummary(unit);
  } else {
    renderQuiz(unit);
  }
}

// ──────────────────────────────────────────────
// TAB SWITCH
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
  if (tab === 'summary') {
    await loadSummary(unit);
  } else {
    renderQuiz(unit);
  }
}

// ──────────────────────────────────────────────
// SUMMARY — Markdown fetch & render
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

    // marked.js でHTML変換
    mdBody.innerHTML = marked.parse(md);

    // unitの進捗（クイズ結果があれば表示）
    updateUnitProgress(unit);

    loading.style.display = 'none';
    body.style.display    = 'block';

  } catch (e) {
    loading.style.display = 'none';
    document.getElementById('errorMsg').textContent =
      `「${unit.file}」を読み込めませんでした: ${e.message}`;
    error.style.display = 'flex';
  }
}

function reloadUnit() {
  const unit = UNITS[currentUnitIdx];
  delete mdCache[unit.file];   // キャッシュ破棄して再取得
  loadSummary(unit);
}

function updateUnitProgress(unit) {
  const el = document.getElementById('unitProgress');
  if (!quizState) {
    const total = (unit.quiz || []).length;
    el.textContent = total > 0 ? `穴埋め ${total}問` : '';
    return;
  }
  const correct = quizState.correct.filter(Boolean).length;
  const total   = quizState.correct.length;
  el.textContent = `穴埋め ${correct} / ${total} 正解`;
}

// ──────────────────────────────────────────────
// QUIZ
// ──────────────────────────────────────────────
function renderQuiz(unit) {
  const questions = unit.quiz || [];

  document.getElementById('panelQuiz').style.display = 'block';
  document.getElementById('panelSummary').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display   = 'none';

  const wrap = document.getElementById('quizWrap');

  if (!questions.length) {
    wrap.innerHTML = `<p style="color:var(--color-text-secondary);font-size:0.88rem;padding:2rem 0">
      このUnitにはクイズがありません。</p>`;
    document.getElementById('quizScore').textContent = '';
    document.getElementById('quizProgressFill').style.width = '0%';
    return;
  }

  wrap.innerHTML = questions.map((q, qi) => {
    // ___ を <input> に置き換え
    let blankIdx = 0;
    const qHtml = escapeHtml(q.q).replace(/___/g, () => {
      const idx = blankIdx++;
      return `<input
        class="blank-input"
        data-qi="${qi}"
        data-bi="${idx}"
        type="text"
        placeholder="　　　"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      >`;
    });
    return `
      <div class="q-item" id="qitem-${qi}">
        <div class="q-text">Q${qi + 1}. ${qHtml}</div>
        <div class="q-feedback" id="qfb-${qi}"></div>
      </div>
    `;
  }).join('');

  // quizState 初期化
  quizState = {
    inputs:  wrap.querySelectorAll('.blank-input'),
    correct: new Array(questions.reduce((s, q) => s + q.blanks.length, 0)).fill(null),
  };

  // 進捗バーを入力連動
  quizState.inputs.forEach(inp => {
    inp.addEventListener('input', updateQuizProgress);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') focusNextBlank(inp);
    });
  });

  document.getElementById('quizScore').textContent = '';
  updateQuizProgress();
}

function updateQuizProgress() {
  if (!quizState) return;
  const inputs = document.querySelectorAll('.blank-input');
  const filled = [...inputs].filter(i => i.value.trim().length > 0).length;
  const pct    = inputs.length ? filled / inputs.length * 100 : 0;
  document.getElementById('quizProgressFill').style.width = pct + '%';
}

function focusNextBlank(current) {
  const inputs = [...document.querySelectorAll('.blank-input')];
  const idx    = inputs.indexOf(current);
  if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();
}

function checkQuiz() {
  const unit      = UNITS[currentUnitIdx];
  const questions = unit.quiz || [];
  if (!questions.length) return;

  let globalBlankIdx = 0;
  let totalCorrect   = 0;
  let totalBlanks    = 0;

  questions.forEach((q, qi) => {
    const item = document.getElementById(`qitem-${qi}`);
    const fb   = document.getElementById(`qfb-${qi}`);
    let qAllCorrect = true;

    q.blanks.forEach((ans, bi) => {
      const inp = document.querySelector(`.blank-input[data-qi="${qi}"][data-bi="${bi}"]`);
      if (!inp) return;
      totalBlanks++;

      const ok = normalizeAnswer(inp.value) === normalizeAnswer(ans);
      inp.classList.toggle('correct', ok);
      inp.classList.toggle('wrong',   !ok);
      if (quizState) quizState.correct[globalBlankIdx] = ok;
      globalBlankIdx++;

      if (ok) totalCorrect++;
      else    qAllCorrect = false;
    });

    item.classList.toggle('all-correct', qAllCorrect);
    item.classList.toggle('has-wrong',   !qAllCorrect);

    if (qAllCorrect) {
      fb.className     = 'q-feedback correct';
      fb.textContent   = '✓ 正解';
    } else {
      fb.className   = 'q-feedback wrong';
      fb.textContent = '✗ 正解: ' + q.blanks.join(' ／ ');
    }
  });

  const pct = totalBlanks ? Math.round(totalCorrect / totalBlanks * 100) : 0;
  document.getElementById('quizScore').textContent = `${totalCorrect} / ${totalBlanks}  (${pct}%)`;

  // サイドの quiz dot を更新
  const dot = document.getElementById(`navdot-${unit.id}`);
  if (dot) dot.classList.toggle('done', pct === 100);

  updateQuizProgress();
  updateUnitProgress(unit);

  showToast(pct === 100 ? '🎉 全問正解！' : `${totalCorrect} / ${totalBlanks} 正解`);
}

function retryWrong() {
  // 間違えた入力欄だけクリアしてフォーカス
  const inputs = [...document.querySelectorAll('.blank-input')];
  let firstWrong = null;
  inputs.forEach(inp => {
    if (inp.classList.contains('wrong')) {
      inp.value = '';
      inp.classList.remove('wrong');
      if (!firstWrong) firstWrong = inp;
    }
  });

  // フィードバックをクリア
  document.querySelectorAll('.q-item').forEach(item => {
    item.classList.remove('has-wrong', 'all-correct');
  });
  document.querySelectorAll('.q-feedback').forEach(fb => {
    if (fb.classList.contains('wrong')) {
      fb.textContent = '';
      fb.className = 'q-feedback';
    }
  });

  document.getElementById('quizScore').textContent = '';
  if (firstWrong) firstWrong.focus();
  updateQuizProgress();
}

function resetQuiz() {
  renderQuiz(UNITS[currentUnitIdx]);
}

// 答え合わせ用正規化：全角・半角スペース除去、小文字統一、句読点除去
function normalizeAnswer(s) {
  return (s || '')
    .replace(/[　\s]/g, '')            // スペース除去（全角含む）
    .replace(/[、。，,・]/g, '')       // 句読点除去
    .replace(/[（(）)]/g, '')          // 括弧除去
    .replace(/〜/g, '〜')
    .toLowerCase();
}

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────

// HEX → 10%透過の背景色（CSS変数に渡す用）
function hexToLight(hex) {
  // hex: #rrggbb
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.09)`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
}

// ──────────────────────────────────────────────
// KEYBOARD SHORTCUT
// ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'l') navigateTo(currentUnitIdx + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'h') navigateTo(currentUnitIdx - 1);
  if (e.key === 's') switchTab('summary');
  if (e.key === 'q') switchTab('quiz');
});
